"""
Daily report router.
- Generate a report for a given date / campaign
- List past reports
"""

from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.db.database import get_db
from app.models.campaign import DailyReport, Campaign
from app.services.report_service import generate_report

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.get("/")
async def list_reports(
    user_id: str = Query(...),
    campaign_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all daily reports for a user (optionally filtered by campaign)."""
    filters = [DailyReport.user_id == user_id]
    if campaign_id:
        filters.append(DailyReport.campaign_id == campaign_id)

    result = await db.execute(
        select(DailyReport)
        .where(and_(*filters))
        .order_by(DailyReport.report_date.desc())
        .limit(30)
    )
    reports = result.scalars().all()
    return [_serialize(r) for r in reports]


@router.post("/generate")
async def create_report(body: dict, db: AsyncSession = Depends(get_db)):
    """
    Generate (or regenerate) a daily report.
    body: { userId, campaignId?, reportDate? (YYYY-MM-DD) }
    """
    user_id = body.get("userId")
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required")

    campaign_id = body.get("campaignId")
    report_date_str = body.get("reportDate")
    report_date = date.fromisoformat(report_date_str) if report_date_str else date.today()

    report = await generate_report(
        db=db,
        user_id=user_id,
        campaign_id=campaign_id,
        report_date=report_date,
    )
    return _serialize(report)


@router.get("/{report_id}")
async def get_report(report_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DailyReport).where(DailyReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return _serialize(report)


def _serialize(r: DailyReport) -> dict:
    return {
        "id": r.id,
        "userId": r.user_id,
        "campaignId": r.campaign_id,
        "reportDate": r.report_date.isoformat() if r.report_date else None,
        "totalCalls": r.total_calls,
        "connectedCalls": r.connected_calls,
        "interestedCount": r.interested_count,
        "notInterestedCount": r.not_interested_count,
        "voicemailCount": r.voicemail_count,
        "noAnswerCount": r.no_answer_count,
        "callbackCount": r.callback_count,
        "confirmedCount": r.confirmed_count,
        "convertedCount": r.converted_count,
        "followUpsSent": r.follow_ups_sent,
        "costCents": r.cost_cents,
        "connectionRate": r.connection_rate,
        "interestRate": r.interest_rate,
        "insights": r.insights,
        "recommendations": r.recommendations,
        "createdAt": r.created_at.isoformat(),
    }
