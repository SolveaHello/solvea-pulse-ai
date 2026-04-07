"""
Line B — User Operations router.
Endpoints for:
- Importing audience users (CSV data)
- Viewing RFM segment summary
- Managing AudienceUsers
- Creating and sending Line B audience campaigns
"""

import csv
import io
import uuid
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.db.database import get_db
from app.models.audience import AudienceUser, RFMScore, RFMSegment, AudienceCampaign, AudienceCampaignStatus, AudienceFollowUp
from app.services.rfm_service import recalculate_all, get_segment_summary

router = APIRouter(prefix="/api/v1/audience", tags=["audience"])


# ─── Segment Overview ────────────────────────────────────────────────────────

@router.get("/segments")
async def list_segments(
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Return RFM segment summary with user counts."""
    return await get_segment_summary(db, user_id)


@router.post("/recalculate")
async def trigger_recalculate(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger RFM recalculation for all audience users."""
    user_id = body.get("userId")
    if not user_id:
        raise HTTPException(status_code=400, detail="userId required")
    result = await recalculate_all(db, user_id)
    return result


# ─── Audience Users ───────────────────────────────────────────────────────────

@router.get("/users")
async def list_audience_users(
    user_id: str = Query(...),
    segment: str | None = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    """List audience users, optionally filtered by RFM segment."""
    filters = [AudienceUser.user_id == user_id, AudienceUser.is_dnc == False]
    if segment:
        try:
            filters.append(AudienceUser.segment == RFMSegment[segment])
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Invalid segment: {segment}")

    result = await db.execute(
        select(AudienceUser)
        .where(and_(*filters))
        .order_by(AudienceUser.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    users = result.scalars().all()
    return [_serialize_user(u) for u in users]


@router.post("/users/import/csv")
async def import_audience_csv(
    user_id: str = Query(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Import audience users from CSV.
    Expected columns: external_id, name, email, phone, last_purchase_date,
                      total_orders, total_spent (in dollars)
    """
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    skipped = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):
        try:
            email = (row.get("email") or "").strip().lower() or None
            phone = (row.get("phone") or "").strip() or None
            external_id = (row.get("external_id") or row.get("user_id") or "").strip() or None

            # Skip if no contact method
            if not email and not phone:
                skipped += 1
                continue

            # Parse last_purchase_date
            lpd_raw = (row.get("last_purchase_date") or "").strip()
            last_purchase_date = None
            if lpd_raw:
                for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
                    try:
                        last_purchase_date = datetime.strptime(lpd_raw, fmt).date()
                        break
                    except ValueError:
                        continue

            total_orders = int(row.get("total_orders") or 0)
            total_spent_raw = float(row.get("total_spent") or 0)
            total_spent_cents = int(total_spent_raw * 100)

            # Upsert by email or external_id
            existing = None
            if email:
                result = await db.execute(
                    select(AudienceUser).where(
                        AudienceUser.user_id == user_id,
                        AudienceUser.email == email,
                    )
                )
                existing = result.scalar_one_or_none()

            if existing:
                existing.last_purchase_date = last_purchase_date or existing.last_purchase_date
                existing.total_orders = total_orders or existing.total_orders
                existing.total_spent_cents = total_spent_cents or existing.total_spent_cents
                existing.updated_at = datetime.utcnow()
            else:
                u = AudienceUser(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    external_id=external_id,
                    name=(row.get("name") or "").strip() or None,
                    email=email,
                    phone=phone,
                    last_purchase_date=last_purchase_date,
                    total_orders=total_orders,
                    total_spent_cents=total_spent_cents,
                )
                db.add(u)

            imported += 1

        except Exception as e:
            errors.append({"row": row_num, "error": str(e)})

    await db.commit()

    # Auto-trigger RFM recalculation
    rfm_result = await recalculate_all(db, user_id)

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:20],  # cap error detail
        "rfm": rfm_result,
    }


# ─── Audience Campaigns ───────────────────────────────────────────────────────

@router.get("/campaigns")
async def list_audience_campaigns(
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """List Line B audience campaigns."""
    result = await db.execute(
        select(AudienceCampaign)
        .where(AudienceCampaign.user_id == user_id)
        .order_by(AudienceCampaign.created_at.desc())
    )
    campaigns = result.scalars().all()
    return [_serialize_campaign(c) for c in campaigns]


@router.post("/campaigns")
async def create_audience_campaign(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Create an audience campaign targeting specific RFM segments.
    Claude generates personalized content per segment.
    """
    user_id = body.get("userId")
    target_segments = body.get("targetSegments", [])
    channel = body.get("channel", "EMAIL")
    name = body.get("name", "Untitled Campaign")
    subject = body.get("subject")
    content_template = body.get("contentTemplate")

    if not user_id:
        raise HTTPException(status_code=400, detail="userId required")
    if not target_segments:
        raise HTTPException(status_code=400, detail="targetSegments required")

    # If no content template provided, generate with Claude
    if not content_template:
        from app.services.claude_service import _generate_audience_content
        try:
            content_template = await _generate_audience_content(
                segments=target_segments,
                channel=channel,
                objective=body.get("objective", "Re-engage customers"),
            )
        except Exception:
            content_template = "Hi {name}, we'd love to hear from you again!"

    campaign = AudienceCampaign(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=name,
        target_segments=target_segments,
        channel=channel,
        subject=subject,
        content_template=content_template,
        scheduled_at=_parse_dt(body.get("scheduledAt")),
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return _serialize_campaign(campaign)


@router.post("/campaigns/{campaign_id}/send")
async def send_audience_campaign(
    campaign_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Execute an audience campaign: send Email/SMS to all users in target segments.
    """
    result = await db.execute(select(AudienceCampaign).where(AudienceCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Fetch target users
    users_result = await db.execute(
        select(AudienceUser).where(
            AudienceUser.user_id == campaign.user_id,
            AudienceUser.segment.in_([RFMSegment[s] for s in campaign.target_segments if s in RFMSegment.__members__]),
            AudienceUser.is_dnc == False,
        )
    )
    users = users_result.scalars().all()

    sent = 0
    failed = 0
    now = datetime.utcnow()

    for u in users:
        try:
            # Personalize content
            content = (campaign.content_template or "").replace("{name}", u.name or "there")
            subject = (campaign.subject or "").replace("{name}", u.name or "there")

            if campaign.channel in ("EMAIL", "BOTH") and u.email:
                from app.services.email_service import send_email
                result_ok = await send_email(
                    to_email=u.email,
                    to_name=u.name or "",
                    subject=subject or "A message for you",
                    body=content,
                )
                fu = AudienceFollowUp(
                    id=str(uuid.uuid4()),
                    audience_user_id=u.id,
                    campaign_id=campaign.id,
                    channel="EMAIL",
                    subject=subject,
                    content=content,
                    rfm_segment=u.segment.value,
                    status="SENT" if result_ok.get("ok") else "FAILED",
                    sent_at=now if result_ok.get("ok") else None,
                )
                db.add(fu)
                if result_ok.get("ok"):
                    sent += 1
                else:
                    failed += 1

            if campaign.channel in ("SMS", "BOTH") and u.phone:
                from app.services.sms_service import send_follow_up_sms
                sms_content = content[:160]  # SMS limit
                sms_result = await send_follow_up_sms(
                    to_phone=u.phone,
                    contact_name=u.name or "",
                    business_name="",
                    campaign_objective=subject or "follow-up",
                    disposition="AUDIENCE",
                )
                fu_sms = AudienceFollowUp(
                    id=str(uuid.uuid4()),
                    audience_user_id=u.id,
                    campaign_id=campaign.id,
                    channel="SMS",
                    content=sms_content,
                    rfm_segment=u.segment.value,
                    status="SENT" if sms_result.get("ok") else "FAILED",
                    sent_at=now if sms_result.get("ok") else None,
                )
                db.add(fu_sms)
                if sms_result.get("ok"):
                    sent += 1
                else:
                    failed += 1

        except Exception as e:
            failed += 1
            print(f"[audience] send failed for user {u.id}: {e}")

    campaign.status = AudienceCampaignStatus.COMPLETED
    campaign.sent_count = sent
    campaign.updated_at = now
    await db.commit()

    return {"campaignId": campaign_id, "sent": sent, "failed": failed, "total": len(users)}


@router.get("/campaigns/{campaign_id}/stats")
async def campaign_stats(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Return send/open/click/reply stats for an audience campaign."""
    result = await db.execute(select(AudienceCampaign).where(AudienceCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    fu_result = await db.execute(
        select(AudienceFollowUp).where(AudienceFollowUp.campaign_id == campaign_id)
    )
    fus = fu_result.scalars().all()

    sent = sum(1 for f in fus if f.status in ("SENT", "OPENED", "CLICKED", "REPLIED"))
    opened = sum(1 for f in fus if f.opened_at is not None)
    clicked = sum(1 for f in fus if f.clicked_at is not None)
    replied = sum(1 for f in fus if f.replied_at is not None)

    return {
        "campaignId": campaign_id,
        "sent": sent,
        "opened": opened,
        "clicked": clicked,
        "replied": replied,
        "openRate": round(opened / sent * 100, 1) if sent > 0 else 0,
        "clickRate": round(clicked / sent * 100, 1) if sent > 0 else 0,
        "replyRate": round(replied / sent * 100, 1) if sent > 0 else 0,
    }


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _serialize_user(u: AudienceUser) -> dict:
    return {
        "id": u.id,
        "externalId": u.external_id,
        "name": u.name,
        "email": u.email,
        "phone": u.phone,
        "lastPurchaseDate": u.last_purchase_date.isoformat() if u.last_purchase_date else None,
        "totalOrders": u.total_orders,
        "totalSpent": round(u.total_spent_cents / 100, 2),
        "segment": u.segment.value,
        "segmentUpdatedAt": u.segment_updated_at.isoformat() if u.segment_updated_at else None,
        "isDnc": u.is_dnc,
        "createdAt": u.created_at.isoformat(),
    }


def _serialize_campaign(c: AudienceCampaign) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "targetSegments": c.target_segments,
        "channel": c.channel,
        "subject": c.subject,
        "contentTemplate": c.content_template,
        "status": c.status.value,
        "scheduledAt": c.scheduled_at.isoformat() if c.scheduled_at else None,
        "sentCount": c.sent_count,
        "openedCount": c.opened_count,
        "clickedCount": c.clicked_count,
        "repliedCount": c.replied_count,
        "openRate": round(c.opened_count / c.sent_count * 100, 1) if c.sent_count > 0 else 0,
        "createdAt": c.created_at.isoformat(),
    }


def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None
