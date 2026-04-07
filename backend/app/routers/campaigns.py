from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from app.db.database import get_db
from app.models.campaign import Campaign, Contact, ContactList, Call, CallStatus, Disposition, ScriptVersion
from app.services.vapi_service import create_assistant, batch_create_calls
from app.utils.sse_manager import sse_manager

router = APIRouter(prefix="/api/v1/campaigns", tags=["campaigns"])


@router.post("/{campaign_id}/vapi-assistant")
async def create_vapi_assistant(
    campaign_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """Create a Vapi assistant for the campaign and store the ID."""
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    import os
    webhook_url = os.environ.get("NEXT_PUBLIC_APP_URL", "https://yourapp.com") + "/api/webhooks/vapi"

    assistant = await create_assistant(
        name=campaign.name,
        script=body.get("script", campaign.script),
        agent_config=body.get("agentConfig", campaign.agent_config),
        webhook_url=webhook_url,
    )

    assistant_id = assistant.get("id")
    campaign.vapi_assistant_id = assistant_id
    await db.commit()

    return {"assistantId": assistant_id}


@router.post("/{campaign_id}/batch-call")
async def start_batch_calls(
    campaign_id: str,
    body: dict,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Queue outbound calls for all pending contacts in the campaign."""
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if not campaign.vapi_assistant_id:
        raise HTTPException(status_code=400, detail="Vapi assistant not configured")

    assistant_id = body.get("assistantId") or campaign.vapi_assistant_id
    phone_number_id = body.get("vapiPhoneNumberId")
    if not phone_number_id:
        from app.config import settings
        phone_number_id = settings.VAPI_PHONE_NUMBER_ID

    # Fetch pending contacts
    result = await db.execute(
        select(Contact)
        .join(ContactList, Contact.contact_list_id == ContactList.id)
        .where(
            ContactList.campaign_id == campaign_id,
            Contact.disposition == Disposition.PENDING,
        )
    )
    contacts = result.scalars().all()

    if not contacts:
        raise HTTPException(status_code=400, detail="No pending contacts")

    # Create Call records in DB
    call_records = []
    for contact in contacts:
        call = Call(
            id=str(uuid.uuid4()),
            campaign_id=campaign_id,
            contact_id=contact.id,
            status=CallStatus.QUEUED,
        )
        db.add(call)
        call_records.append((contact, call))
    await db.commit()

    # Map contact_id -> call_id for callback
    contact_call_map = {contact.id: call.id for contact, call in call_records}

    async def on_call_created(contact_id: str, vapi_call_id: str):
        """Callback after each Vapi call is created — update call record."""
        call_id = contact_call_map.get(contact_id)
        if call_id:
            async with db.__class__(bind=db.bind) as session:
                call_result = await session.execute(select(Call).where(Call.id == call_id))
                call = call_result.scalar_one_or_none()
                if call:
                    call.vapi_call_id = vapi_call_id
                    await session.commit()

    # Run batch calls in background
    contact_list = [
        {"id": c.id, "phone": c.phone, "name": c.name or c.business_name}
        for c in contacts
    ]

    background_tasks.add_task(
        batch_create_calls,
        assistant_id=assistant_id,
        phone_number_id=phone_number_id,
        contacts=contact_list,
        on_call_created=on_call_created,
    )

    return {"queued": len(contacts), "campaignId": campaign_id}


@router.post("/{campaign_id}/script-insights")
async def generate_script_insights(
    campaign_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Use AI to analyze script performance and suggest improvements.
    Returns suggestions; human must approve before script is updated.
    """
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    report_stats = body.get("reportStats", {})
    from app.services.claude_service import generate_script_insights as _gen_insights
    suggestions = await _gen_insights(campaign.script, report_stats, campaign.name)

    return {"campaignId": campaign_id, "currentScript": campaign.script, "suggestions": suggestions}


@router.post("/{campaign_id}/script-approve")
async def approve_script_update(
    campaign_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Human approves a suggested script update. Creates a ScriptVersion record
    and applies the new script to the campaign.
    """
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    new_script = body.get("newScript")
    if not new_script:
        raise HTTPException(status_code=400, detail="newScript is required")

    approved_by = body.get("approvedBy", "unknown")
    change_summary = body.get("changeSummary", "Script updated based on AI recommendations")
    ai_suggestions = body.get("aiSuggestions")

    # Get next version number
    ver_result = await db.execute(
        select(ScriptVersion)
        .where(ScriptVersion.campaign_id == campaign_id)
        .order_by(ScriptVersion.version.desc())
        .limit(1)
    )
    latest = ver_result.scalar_one_or_none()
    next_version = (latest.version + 1) if latest else 1

    # Archive old script
    old_version = ScriptVersion(
        id=str(uuid.uuid4()),
        campaign_id=campaign_id,
        version=next_version - 1 if next_version > 1 else 0,
        script=campaign.script,
        change_summary="Previous version archived",
        is_active=False,
    )
    db.add(old_version)

    # Save new version as active
    new_version = ScriptVersion(
        id=str(uuid.uuid4()),
        campaign_id=campaign_id,
        version=next_version,
        script=new_script,
        change_summary=change_summary,
        ai_suggestions=ai_suggestions,
        is_active=True,
        approved_by=approved_by,
        approved_at=datetime.utcnow(),
    )
    db.add(new_version)

    # Update live script
    campaign.script = new_script
    await db.commit()

    return {
        "campaignId": campaign_id,
        "version": next_version,
        "script": new_script,
        "approvedBy": approved_by,
    }


@router.get("/{campaign_id}/script-versions")
async def list_script_versions(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """List all script versions for a campaign."""
    result = await db.execute(
        select(ScriptVersion)
        .where(ScriptVersion.campaign_id == campaign_id)
        .order_by(ScriptVersion.version.desc())
    )
    versions = result.scalars().all()
    return [
        {
            "id": v.id,
            "version": v.version,
            "script": v.script,
            "changeSummary": v.change_summary,
            "isActive": v.is_active,
            "approvedBy": v.approved_by,
            "approvedAt": v.approved_at.isoformat() if v.approved_at else None,
            "createdAt": v.created_at.isoformat(),
        }
        for v in versions
    ]


@router.get("/{campaign_id}/sse")
async def campaign_sse_stream(campaign_id: str):
    """SSE endpoint for real-time call status updates."""
    return StreamingResponse(
        sse_manager.event_stream(campaign_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
