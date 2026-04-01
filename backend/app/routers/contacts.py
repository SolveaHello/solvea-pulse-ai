from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from app.db.database import get_db
from app.models.campaign import Contact, ContactList, SourceType
from app.services.contact_import_service import parse_contact_file
from app.services.google_maps_service import search_places_with_details

router = APIRouter(prefix="/api/v1/contacts", tags=["contacts"])


@router.post("/google-maps-search")
async def search_maps(body: dict):
    query = body.get("query", "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="query required")
    results = await search_places_with_details(query)
    return results


@router.post("/parse-csv")
async def parse_csv(
    file: UploadFile = File(...),
    campaign_id: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """Parse uploaded CSV/Excel and save contacts to DB."""
    try:
        parsed = await parse_contact_file(file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not parsed:
        raise HTTPException(status_code=400, detail="No valid phone numbers found in file")

    # Get or create CSV contact list for campaign
    result = await db.execute(
        select(ContactList).where(
            ContactList.campaign_id == campaign_id,
            ContactList.source_type == SourceType.CSV_UPLOAD,
        )
    )
    contact_list = result.scalar_one_or_none()

    if not contact_list:
        # Get campaign user_id
        from app.models.campaign import Campaign
        camp_result = await db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )
        campaign = camp_result.scalar_one_or_none()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        contact_list = ContactList(
            id=str(uuid.uuid4()),
            campaign_id=campaign_id,
            user_id=campaign.user_id,
            name=f"CSV Import — {file.filename}",
            source_type=SourceType.CSV_UPLOAD,
        )
        db.add(contact_list)
        await db.flush()

    # Upsert contacts (skip duplicates by phone)
    existing_result = await db.execute(
        select(Contact.phone).where(Contact.contact_list_id == contact_list.id)
    )
    existing_phones = {row[0] for row in existing_result.fetchall()}

    new_contacts = []
    for c in parsed:
        if c["phone"] in existing_phones:
            continue
        contact = Contact(
            id=str(uuid.uuid4()),
            contact_list_id=contact_list.id,
            phone=c["phone"],
            name=c.get("name"),
            business_name=c.get("businessName"),
            email=c.get("email"),
            address=c.get("address"),
            custom_fields=c.get("customFields"),
        )
        db.add(contact)
        new_contacts.append(contact)

    await db.commit()
    return [{"id": c.id, "phone": c.phone, "name": c.name} for c in new_contacts]
