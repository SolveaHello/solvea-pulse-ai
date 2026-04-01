"""
Vapi.ai webhook event processor.
Called by the Next.js BFF after signature validation.
Handles: transcript-ready, recording-ready, function-call (calendar booking)
"""

import uuid
import httpx
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.campaign import (
    Call, CallStatus, Disposition, Transcript, Recording, CallSummary, Appointment,
    FollowUp, FollowUpChannel, FollowUpStatus, Contact,
)
from app.models.user import User
from app.services.claude_service import summarize_call, detect_language, translate_to_english
from app.services.google_calendar_service import get_next_available_slot, create_event
from app.services.email_service import generate_email_content, send_email
from app.services.sms_service import send_follow_up_sms
from app.utils.sse_manager import sse_manager

# Dispositions that warrant an automatic follow-up
FOLLOWUP_DISPOSITIONS = {Disposition.INTERESTED, Disposition.VOICEMAIL, Disposition.CALLBACK_REQUESTED}

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


@router.post("/vapi/process")
async def process_vapi_event(event: dict, db: AsyncSession = Depends(get_db)):
    """Process Vapi webhook event (called internally from BFF after dedup)."""
    event_type = event.get("type")
    call_data = event.get("call", {})
    vapi_call_id = call_data.get("id")

    if not vapi_call_id:
        return {"ok": True}

    # Get our call record
    result = await db.execute(select(Call).where(Call.vapi_call_id == vapi_call_id))
    call = result.scalar_one_or_none()

    if event_type == "transcript-ready":
        await _handle_transcript(call, call_data, event, db)

    elif event_type == "recording-ready":
        await _handle_recording(call, call_data, db)

    elif event_type == "function-call":
        return await _handle_function_call(call, event, db)

    return {"ok": True}


async def _handle_transcript(call, call_data: dict, event: dict, db: AsyncSession):
    if not call:
        return

    transcript_text = call_data.get("transcript", "")
    messages = call_data.get("messages", [])

    # Detect language
    language = await detect_language(transcript_text[:500] if transcript_text else "")
    translated_text = None
    if language and language != "en" and transcript_text:
        translated_text = await translate_to_english(transcript_text)

    # Store transcript
    existing = await db.execute(select(Transcript).where(Transcript.call_id == call.id))
    if not existing.scalar_one_or_none():
        transcript = Transcript(
            id=str(uuid.uuid4()),
            call_id=call.id,
            raw_text=transcript_text,
            translated_text=translated_text,
            language=language,
            messages=messages,
        )
        db.add(transcript)

    # Generate summary
    result = await db.execute(select(CallSummary).where(CallSummary.call_id == call.id))
    if not result.scalar_one_or_none():
        # Get campaign objective for context
        from app.models.campaign import Campaign
        camp_result = await db.execute(
            select(Campaign.objective).where(Campaign.id == call.campaign_id)
        )
        objective = camp_result.scalar_one_or_none() or ""

        text_for_summary = translated_text or transcript_text
        try:
            summary_data = await summarize_call(text_for_summary, objective)

            summary = CallSummary(
                id=str(uuid.uuid4()),
                call_id=call.id,
                summary=summary_data.get("summary", ""),
                key_points=summary_data.get("keyPoints", []),
                sentiment=summary_data.get("sentiment"),
                next_action=summary_data.get("nextAction"),
                extracted_data=summary_data.get("extractedData"),
            )
            db.add(summary)

            # Update disposition from summary
            disposition_str = summary_data.get("disposition", "CALLED")
            try:
                call.disposition = Disposition[disposition_str]
            except KeyError:
                call.disposition = Disposition.CALLED

        except Exception as e:
            print(f"Summarization failed for call {call.id}: {e}")

    await db.commit()

    # Auto-trigger follow-up for hot dispositions
    if call.disposition in FOLLOWUP_DISPOSITIONS:
        await _trigger_auto_followup(call, db)

    # Broadcast SSE event
    await sse_manager.publish(call.campaign_id, {
        "type": "call-updated",
        "callId": call.id,
        "vapiCallId": vapi_call_id,
        "status": call.status.value,
        "disposition": call.disposition.value,
    })


async def _handle_recording(call, call_data: dict, db: AsyncSession):
    if not call:
        return

    recording_url = call_data.get("recordingUrl")
    if not recording_url:
        return

    existing = await db.execute(select(Recording).where(Recording.call_id == call.id))
    if existing.scalar_one_or_none():
        return

    # Archive to S3
    s3_key, s3_url = await _archive_recording_to_s3(
        recording_url, call.campaign_id, call.id
    )

    recording = Recording(
        id=str(uuid.uuid4()),
        call_id=call.id,
        vapi_url=recording_url,
        s3_key=s3_key,
        s3_url=s3_url,
    )
    db.add(recording)
    await db.commit()


async def _handle_function_call(call, event: dict, db: AsyncSession) -> dict:
    """Handle bookAppointment function call from AI mid-call."""
    func_call = event.get("functionCall", {})
    if func_call.get("name") != "bookAppointment":
        return {"result": "Function not supported"}

    params = func_call.get("parameters", {})
    attendee_name = params.get("attendeeName", "")
    attendee_email = params.get("attendeeEmail")
    topic = params.get("topic", "Meeting")

    if not call:
        return {"result": "Unable to book — call record not found"}

    # Get user's Google tokens
    from app.models.campaign import Campaign
    camp_result = await db.execute(
        select(Campaign).where(Campaign.id == call.campaign_id)
    )
    campaign = camp_result.scalar_one_or_none()
    if not campaign:
        return {"result": "Unable to book — campaign not found"}

    user_result = await db.execute(select(User).where(User.id == campaign.user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.google_calendar_tokens:
        return {"result": "Calendar not connected — unable to book meeting"}

    # Find next available slot
    slot = await get_next_available_slot(user.google_calendar_tokens)
    if not slot:
        return {"result": "No available slots in the next 7 days"}

    start_time, end_time = slot

    # Create calendar event
    event_data = await create_event(
        encrypted_tokens=user.google_calendar_tokens,
        title=f"{topic} — {attendee_name}",
        start_time=start_time,
        end_time=end_time,
        description=f"Meeting scheduled during outbound call. Campaign: {campaign.name}",
        attendee_email=attendee_email,
        attendee_name=attendee_name,
    )

    # Store in DB
    apt = Appointment(
        id=str(uuid.uuid4()),
        call_id=call.id,
        google_event_id=event_data.get("googleEventId"),
        title=f"{topic} — {attendee_name}",
        start_time=start_time,
        end_time=end_time,
        attendee_email=attendee_email,
        attendee_name=attendee_name,
        meeting_link=event_data.get("meetingLink"),
        status="confirmed",
    )
    db.add(apt)

    # Mark contact as interested
    call.disposition = Disposition.INTERESTED
    await db.commit()

    # SSE broadcast
    await sse_manager.publish(call.campaign_id, {
        "type": "appointment-booked",
        "callId": call.id,
        "appointmentId": apt.id,
        "startTime": start_time.isoformat(),
        "meetingLink": event_data.get("meetingLink"),
    })

    # Return result to Vapi so agent reads it aloud
    time_str = start_time.strftime("%A %B %d at %I:%M %p UTC")
    meeting_link = event_data.get("meetingLink", "")
    return {
        "result": (
            f"I've scheduled a meeting for {time_str}. "
            f"You'll receive a calendar invite{' at ' + attendee_email if attendee_email else ''}. "
            f"{'The Google Meet link is: ' + meeting_link if meeting_link else ''}"
        )
    }


async def _trigger_auto_followup(call: Call, db: AsyncSession):
    """
    After a call ends with a hot disposition, create and send follow-up messages.
    - Email if contact has email address
    - SMS as secondary channel (or primary if no email)
    Runs fire-and-forget; errors are logged but do not fail the webhook.
    """
    try:
        contact_result = await db.execute(select(Contact).where(Contact.id == call.contact_id))
        contact = contact_result.scalar_one_or_none()
        if not contact:
            return

        from app.models.campaign import Campaign
        camp_result = await db.execute(select(Campaign).where(Campaign.id == call.campaign_id))
        campaign = camp_result.scalar_one_or_none()
        if not campaign:
            return

        # Get call summary for email personalisation
        summary_result = await db.execute(
            select(CallSummary).where(CallSummary.call_id == call.id)
        )
        call_summary = summary_result.scalar_one_or_none()

        # --- EMAIL follow-up ---
        if contact.email:
            email_data = await generate_email_content(
                contact_name=contact.name or "",
                business_name=contact.business_name or "",
                campaign_objective=campaign.objective,
                call_summary=call_summary.summary if call_summary else "",
                call_sentiment=call_summary.sentiment or "neutral" if call_summary else "neutral",
                next_action=call_summary.next_action if call_summary else None,
            )

            followup = FollowUp(
                id=str(uuid.uuid4()),
                contact_id=contact.id,
                campaign_id=campaign.id,
                call_id=call.id,
                channel=FollowUpChannel.EMAIL,
                subject=email_data.get("subject"),
                content=email_data.get("body", ""),
                status=FollowUpStatus.PENDING,
            )
            db.add(followup)
            await db.commit()

            send_result = await send_email(
                to_email=contact.email,
                to_name=contact.name or contact.business_name or "",
                subject=email_data["subject"],
                body=email_data["body"],
            )
            followup.status = FollowUpStatus.SENT if send_result["ok"] else FollowUpStatus.FAILED
            followup.sent_at = datetime.utcnow() if send_result["ok"] else None
            await db.commit()

        # --- SMS follow-up (always sent for VOICEMAIL/CALLBACK; skip for INTERESTED if email sent) ---
        send_sms = (
            call.disposition in (Disposition.VOICEMAIL, Disposition.CALLBACK_REQUESTED)
            or not contact.email
        )
        if send_sms and contact.phone:
            sms_result = await send_follow_up_sms(
                to_phone=contact.phone,
                contact_name=contact.name or "",
                business_name=contact.business_name or "",
                campaign_objective=campaign.objective,
                disposition=call.disposition.value,
            )
            sms_followup = FollowUp(
                id=str(uuid.uuid4()),
                contact_id=contact.id,
                campaign_id=campaign.id,
                call_id=call.id,
                channel=FollowUpChannel.SMS,
                content=f"Follow-up SMS for {call.disposition.value}",
                status=FollowUpStatus.SENT if sms_result["ok"] else FollowUpStatus.FAILED,
                sent_at=datetime.utcnow() if sms_result["ok"] else None,
            )
            db.add(sms_followup)
            await db.commit()

    except Exception as e:
        print(f"[webhooks] Auto follow-up failed for call {call.id}: {e}")


async def _archive_recording_to_s3(
    vapi_url: str, campaign_id: str, call_id: str
) -> tuple[str, str]:
    """Download recording from Vapi and upload to S3."""
    try:
        import boto3
        from app.config import settings

        # Download
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(vapi_url)
            resp.raise_for_status()
            audio_data = resp.content

        # Upload to S3
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        s3_key = f"recordings/{campaign_id}/{call_id}.mp3"
        s3_client.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=s3_key,
            Body=audio_data,
            ContentType="audio/mpeg",
        )
        s3_url = f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
        return s3_key, s3_url
    except Exception as e:
        print(f"S3 archival failed: {e}")
        return "", vapi_url  # Fall back to Vapi URL
