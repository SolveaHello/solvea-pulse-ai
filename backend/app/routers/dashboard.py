"""
Unified Dashboard stats endpoint.
Combines Line A funnel metrics + Line B RFM health into a single response
for the Dashboard page.
"""

from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.db.database import get_db
from app.models.campaign import (
    Campaign, Call, CallStatus, Disposition,
    FollowUp, FollowUpStatus, Contact, ContactList,
)

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    user_id: str = Query(...),
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """
    Unified dashboard stats.
    Returns Line A funnel metrics + Line B segment health.
    """
    since = datetime.utcnow() - timedelta(days=days)

    # ─── Line A: Funnel metrics ───────────────────────────────────────────────
    user_campaign_ids = select(Campaign.id).where(Campaign.user_id == user_id)

    # All calls in window
    call_result = await db.execute(
        select(Call).where(
            and_(
                Call.campaign_id.in_(user_campaign_ids),
                Call.created_at >= since,
            )
        )
    )
    calls = call_result.scalars().all()

    total_calls = len(calls)
    connected = sum(1 for c in calls if c.status == CallStatus.COMPLETED and (c.duration or 0) > 0)
    interested = sum(1 for c in calls if c.disposition == Disposition.INTERESTED)
    confirmed = sum(1 for c in calls if c.disposition == Disposition.CONFIRMED)
    converted = sum(1 for c in calls if c.disposition == Disposition.CONVERTED)
    total_cost_cents = sum((c.cost_cents or 0) for c in calls)

    # Follow-ups sent
    fu_result = await db.execute(
        select(func.count()).select_from(FollowUp).where(
            and_(
                FollowUp.campaign_id.in_(user_campaign_ids),
                FollowUp.sent_at >= since,
                FollowUp.status == FollowUpStatus.SENT,
            )
        )
    )
    follow_ups_sent = fu_result.scalar() or 0

    # Email open rate (follow-ups with opened_at set)
    opened_result = await db.execute(
        select(func.count()).select_from(FollowUp).where(
            and_(
                FollowUp.campaign_id.in_(user_campaign_ids),
                FollowUp.sent_at >= since,
                FollowUp.opened_at.isnot(None),
            )
        )
    )
    emails_opened = opened_result.scalar() or 0

    connection_rate = round(connected / total_calls * 100, 1) if total_calls > 0 else 0
    interest_rate = round(interested / connected * 100, 1) if connected > 0 else 0
    followup_conversion_rate = round(confirmed / interested * 100, 1) if interested > 0 else 0
    email_open_rate = round(emails_opened / follow_ups_sent * 100, 1) if follow_ups_sent > 0 else 0

    # Recent campaigns
    camps_result = await db.execute(
        select(Campaign)
        .where(Campaign.user_id == user_id)
        .order_by(Campaign.created_at.desc())
        .limit(5)
    )
    recent_campaigns = [
        {"id": c.id, "name": c.name, "status": c.status.value, "createdAt": c.created_at.isoformat()}
        for c in camps_result.scalars().all()
    ]

    # ─── Line B: RFM segment health ──────────────────────────────────────────
    rfm_health = []
    try:
        from app.models.audience import AudienceUser, RFMSegment
        from app.services.rfm_service import get_segment_summary
        rfm_health = await get_segment_summary(db, user_id)
    except Exception:
        pass

    # At-risk alerts (users in AT_RISK or CANT_LOSE segments)
    at_risk_count = sum(
        s["count"] for s in rfm_health
        if s.get("segment") in ("AT_RISK", "CANT_LOSE")
    )

    return {
        "period": {"days": days, "since": since.isoformat()},
        "lineA": {
            "totalCalls": total_calls,
            "connectionRate": connection_rate,
            "interestRate": interest_rate,
            "followupConversionRate": followup_conversion_rate,
            "emailOpenRate": email_open_rate,
            "confirmedCount": confirmed,
            "convertedCount": converted,
            "totalCostUsd": round(total_cost_cents / 100, 2),
            "followUpsSent": follow_ups_sent,
            "funnel": {
                "called": total_calls,
                "connected": connected,
                "interested": interested,
                "confirmed": confirmed,
                "converted": converted,
            },
        },
        "lineB": {
            "segments": rfm_health,
            "atRiskCount": at_risk_count,
        },
        "recentCampaigns": recent_campaigns,
    }
