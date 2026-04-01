"""
Lead management router.
- List INTERESTED / CONFIRMED / CONVERTED contacts (hot leads)
- Confirm a lead (mark CONFIRMED, record assigned sales rep)
- Convert a lead (mark CONVERTED)
- Reject a lead (mark NOT_INTERESTED)
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.db.database import get_db
from app.models.campaign import Contact, Disposition, ContactList, Campaign, Call, CallSummary

router = APIRouter(prefix="/api/v1/leads", tags=["leads"])

# Dispositions that surface as leads requiring action
HOT_DISPOSITIONS = [
    Disposition.INTERESTED,
    Disposition.CALLBACK_REQUESTED,
    Disposition.CONFIRMED,
    Disposition.CONVERTED,
]


@router.get("/")
async def list_leads(
    user_id: str = Query(...),
    campaign_id: str | None = Query(None),
    disposition: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List hot leads for a user, optionally filtered by campaign or disposition."""
    # Get all contact lists belonging to user's campaigns
    camp_q = select(Campaign.id).where(Campaign.user_id == user_id)
    if campaign_id:
        camp_q = camp_q.where(Campaign.id == campaign_id)

    cl_q = select(ContactList.id).where(ContactList.campaign_id.in_(camp_q))

    disp_filter = [Disposition[disposition]] if disposition else HOT_DISPOSITIONS

    result = await db.execute(
        select(Contact)
        .where(
            and_(
                Contact.contact_list_id.in_(cl_q),
                Contact.disposition.in_(disp_filter),
            )
        )
        .order_by(Contact.created_at.desc())
    )
    contacts = result.scalars().all()

    # Enrich with latest call summary
    leads = []
    for contact in contacts:
        lead = _serialize_contact(contact)
        # Get latest call summary
        call_result = await db.execute(
            select(Call)
            .where(Call.contact_id == contact.id)
            .order_by(Call.created_at.desc())
            .limit(1)
        )
        latest_call = call_result.scalar_one_or_none()
        if latest_call:
            lead["latestCallId"] = latest_call.id
            lead["latestCallDuration"] = latest_call.duration
            lead["latestCallDate"] = latest_call.ended_at.isoformat() if latest_call.ended_at else None
            summary_result = await db.execute(
                select(CallSummary).where(CallSummary.call_id == latest_call.id)
            )
            summary = summary_result.scalar_one_or_none()
            if summary:
                lead["callSummary"] = summary.summary
                lead["callSentiment"] = summary.sentiment
                lead["callKeyPoints"] = summary.key_points
                lead["nextAction"] = summary.next_action
        leads.append(lead)

    return leads


@router.patch("/{contact_id}/confirm")
async def confirm_lead(
    contact_id: str, body: dict, db: AsyncSession = Depends(get_db)
):
    """Mark lead as CONFIRMED and optionally assign to a sales rep."""
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact.disposition = Disposition.CONFIRMED
    contact.confirmed_at = datetime.utcnow()
    if "assignedTo" in body:
        contact.assigned_to = body["assignedTo"]

    await db.commit()
    await db.refresh(contact)
    return _serialize_contact(contact)


@router.patch("/{contact_id}/convert")
async def convert_lead(contact_id: str, db: AsyncSession = Depends(get_db)):
    """Mark lead as CONVERTED (registration / deal completed)."""
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact.disposition = Disposition.CONVERTED
    contact.converted_at = datetime.utcnow()
    await db.commit()
    await db.refresh(contact)
    return _serialize_contact(contact)


@router.patch("/{contact_id}/reject")
async def reject_lead(contact_id: str, db: AsyncSession = Depends(get_db)):
    """Mark lead as NOT_INTERESTED — remove from follow-up queue."""
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact.disposition = Disposition.NOT_INTERESTED
    await db.commit()
    await db.refresh(contact)
    return _serialize_contact(contact)


def _serialize_contact(c: Contact) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "businessName": c.business_name,
        "phone": c.phone,
        "email": c.email,
        "address": c.address,
        "website": c.website,
        "disposition": c.disposition.value,
        "assignedTo": c.assigned_to,
        "confirmedAt": c.confirmed_at.isoformat() if c.confirmed_at else None,
        "convertedAt": c.converted_at.isoformat() if c.converted_at else None,
        "createdAt": c.created_at.isoformat(),
    }
