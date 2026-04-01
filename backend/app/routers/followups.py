"""
Follow-up management router.
- List follow-ups for a campaign
- Manually trigger a follow-up for a contact
- Mark follow-up as replied / skipped
"""

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.db.database import get_db
from app.models.campaign import (
    FollowUp, FollowUpChannel, FollowUpStatus,
    Contact, Call, CallSummary, Campaign, Disposition,
)
from app.services.email_service import generate_email_content, send_email
from app.services.sms_service import send_follow_up_sms

router = APIRouter(prefix="/api/v1/followups", tags=["followups"])


@router.get("/campaign/{campaign_id}")
async def list_campaign_followups(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """List all follow-ups for a campaign."""
    result = await db.execute(
        select(FollowUp)
        .where(FollowUp.campaign_id == campaign_id)
        .order_by(FollowUp.created_at.desc())
    )
    followups = result.scalars().all()
    return [_serialize(f) for f in followups]


@router.post("/trigger")
async def trigger_followup(body: dict, db: AsyncSession = Depends(get_db)):
    """
    Manually trigger a follow-up for a contact.
    body: { contactId, campaignId, callId?, channel: EMAIL|SMS }
    """
    contact_id = body.get("contactId")
    campaign_id = body.get("campaignId")
    call_id = body.get("callId")
    channel = body.get("channel", "EMAIL")

    # Load contact
    contact_result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = contact_result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Load campaign for objective
    campaign_result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = campaign_result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    followup_id = str(uuid.uuid4())

    if channel == "EMAIL":
        if not contact.email:
            raise HTTPException(status_code=400, detail="Contact has no email address")

        # Get call summary for personalisation
        summary_text = ""
        sentiment = "neutral"
        next_action = None
        if call_id:
            summary_result = await db.execute(
                select(CallSummary).where(CallSummary.call_id == call_id)
            )
            summary = summary_result.scalar_one_or_none()
            if summary:
                summary_text = summary.summary
                sentiment = summary.sentiment or "neutral"
                next_action = summary.next_action

        email_data = await generate_email_content(
            contact_name=contact.name or "",
            business_name=contact.business_name or "",
            campaign_objective=campaign.objective,
            call_summary=summary_text,
            call_sentiment=sentiment,
            next_action=next_action,
        )

        followup = FollowUp(
            id=followup_id,
            contact_id=contact_id,
            campaign_id=campaign_id,
            call_id=call_id,
            channel=FollowUpChannel.EMAIL,
            subject=email_data.get("subject"),
            content=email_data.get("body", ""),
            status=FollowUpStatus.PENDING,
        )
        db.add(followup)
        await db.commit()

        # Send
        send_result = await send_email(
            to_email=contact.email,
            to_name=contact.name or contact.business_name or "",
            subject=email_data["subject"],
            body=email_data["body"],
        )

        followup.status = FollowUpStatus.SENT if send_result["ok"] else FollowUpStatus.FAILED
        followup.sent_at = datetime.utcnow() if send_result["ok"] else None

    else:  # SMS
        if not contact.phone:
            raise HTTPException(status_code=400, detail="Contact has no phone number")

        sms_body = f"Hi {contact.name or contact.business_name or 'there'}, following up on our recent call about {campaign.objective}. Reply to learn more or STOP to opt out."

        followup = FollowUp(
            id=followup_id,
            contact_id=contact_id,
            campaign_id=campaign_id,
            call_id=call_id,
            channel=FollowUpChannel.SMS,
            content=sms_body,
            status=FollowUpStatus.PENDING,
        )
        db.add(followup)
        await db.commit()

        send_result = await send_follow_up_sms(
            to_phone=contact.phone,
            contact_name=contact.name or "",
            business_name=contact.business_name or "",
            campaign_objective=campaign.objective,
            disposition=contact.disposition.value,
        )

        followup.status = FollowUpStatus.SENT if send_result["ok"] else FollowUpStatus.FAILED
        followup.sent_at = datetime.utcnow() if send_result["ok"] else None

    await db.commit()
    await db.refresh(followup)
    return _serialize(followup)


@router.patch("/{followup_id}")
async def update_followup(
    followup_id: str, body: dict, db: AsyncSession = Depends(get_db)
):
    """Update follow-up status (mark as replied / skipped)."""
    result = await db.execute(select(FollowUp).where(FollowUp.id == followup_id))
    followup = result.scalar_one_or_none()
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    if "status" in body:
        followup.status = FollowUpStatus[body["status"]]
    if "replyContent" in body:
        followup.reply_content = body["replyContent"]
        followup.replied_at = datetime.utcnow()

    await db.commit()
    await db.refresh(followup)
    return _serialize(followup)


def _serialize(f: FollowUp) -> dict:
    return {
        "id": f.id,
        "contactId": f.contact_id,
        "campaignId": f.campaign_id,
        "callId": f.call_id,
        "channel": f.channel.value,
        "status": f.status.value,
        "subject": f.subject,
        "content": f.content,
        "sentAt": f.sent_at.isoformat() if f.sent_at else None,
        "repliedAt": f.replied_at.isoformat() if f.replied_at else None,
        "replyContent": f.reply_content,
        "createdAt": f.created_at.isoformat(),
    }
