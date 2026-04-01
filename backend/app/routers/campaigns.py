from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from app.db.database import get_db
from app.models.campaign import Campaign, Contact, ContactList, Call, CallStatus, Disposition
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
