"""
Daily report generation service.
- Aggregates call/follow-up stats for a given date range
- Uses Claude to generate natural-language insights and recommendations
"""

import json
import uuid
from datetime import date, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from anthropic import AsyncAnthropic
from app.config import settings
from app.models.campaign import (
    Call, CallStatus, Disposition, FollowUp, FollowUpStatus,
    DailyReport, Campaign, Contact, ContactList
)

anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

REPORT_SYSTEM = """You are a sales performance analyst. Given daily outbound calling statistics,
generate actionable insights and recommendations.

Output a JSON object with exactly these fields:
{
  "insights": [
    "insight 1 (observation about today's performance)",
    "insight 2",
    "insight 3"
  ],
  "recommendations": [
    "recommendation 1 (specific action to improve tomorrow)",
    "recommendation 2",
    "recommendation 3"
  ]
}

Keep each item under 120 characters. Be specific and data-driven.
Output ONLY valid JSON."""


async def _collect_stats(
    db: AsyncSession,
    user_id: str,
    campaign_id: str | None,
    report_date: date,
) -> dict:
    """Aggregate call + follow-up stats for the given date."""
    date_start = datetime.combine(report_date, datetime.min.time())
    date_end = date_start + timedelta(days=1)

    # Base call query filter
    base_filter = [
        Call.ended_at >= date_start,
        Call.ended_at < date_end,
    ]
    if campaign_id:
        base_filter.append(Call.campaign_id == campaign_id)
    else:
        # All campaigns for user
        user_campaign_ids = select(Campaign.id).where(Campaign.user_id == user_id)
        base_filter.append(Call.campaign_id.in_(user_campaign_ids))

    result = await db.execute(select(Call).where(and_(*base_filter)))
    calls = result.scalars().all()

    total = len(calls)
    connected = sum(1 for c in calls if c.status == CallStatus.COMPLETED and c.duration and c.duration > 0)
    interested = sum(1 for c in calls if c.disposition == Disposition.INTERESTED)
    not_interested = sum(1 for c in calls if c.disposition == Disposition.NOT_INTERESTED)
    voicemail = sum(1 for c in calls if c.disposition == Disposition.VOICEMAIL)
    no_answer = sum(1 for c in calls if c.disposition in (Disposition.NO_ANSWER, CallStatus.NO_ANSWER))
    callback = sum(1 for c in calls if c.disposition == Disposition.CALLBACK_REQUESTED)
    confirmed = sum(1 for c in calls if c.disposition == Disposition.CONFIRMED)
    converted = sum(1 for c in calls if c.disposition == Disposition.CONVERTED)
    total_cost = sum((c.cost_cents or 0) for c in calls)

    # Follow-ups sent today
    fu_filter = [
        FollowUp.sent_at >= date_start,
        FollowUp.sent_at < date_end,
        FollowUp.status == FollowUpStatus.SENT,
    ]
    if campaign_id:
        fu_filter.append(FollowUp.campaign_id == campaign_id)
    else:
        fu_filter.append(FollowUp.campaign_id.in_(user_campaign_ids))

    fu_result = await db.execute(select(func.count()).select_from(FollowUp).where(and_(*fu_filter)))
    follow_ups_sent = fu_result.scalar() or 0

    connection_rate = round(connected / total * 100, 1) if total > 0 else 0.0
    interest_rate = round(interested / connected * 100, 1) if connected > 0 else 0.0

    return {
        "total_calls": total,
        "connected_calls": connected,
        "interested_count": interested,
        "not_interested_count": not_interested,
        "voicemail_count": voicemail,
        "no_answer_count": no_answer,
        "callback_count": callback,
        "confirmed_count": confirmed,
        "converted_count": converted,
        "follow_ups_sent": follow_ups_sent,
        "cost_cents": total_cost,
        "connection_rate": connection_rate,
        "interest_rate": interest_rate,
    }


async def _generate_ai_insights(stats: dict, campaign_name: str) -> tuple[list, list]:
    """Use Claude Haiku to generate insights and recommendations."""
    prompt = f"""Campaign: {campaign_name}
Date stats:
- Total calls made: {stats['total_calls']}
- Connected calls: {stats['connected_calls']} ({stats['connection_rate']}% connection rate)
- Interested prospects: {stats['interested_count']} ({stats['interest_rate']}% of connected)
- Not interested: {stats['not_interested_count']}
- Voicemail: {stats['voicemail_count']}
- No answer: {stats['no_answer_count']}
- Callback requested: {stats['callback_count']}
- Confirmed (ready for sales): {stats['confirmed_count']}
- Converted: {stats['converted_count']}
- Follow-ups sent: {stats['follow_ups_sent']}
- Total cost: ${stats['cost_cents'] / 100:.2f}"""

    try:
        message = await anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=REPORT_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text)
        return data.get("insights", []), data.get("recommendations", [])
    except Exception as e:
        print(f"[report_service] AI insight generation failed: {e}")
        return (
            [f"Today {stats['total_calls']} calls were made with a {stats['connection_rate']}% connection rate."],
            ["Review call script for improved connection rates."],
        )


async def generate_report(
    db: AsyncSession,
    user_id: str,
    campaign_id: str | None = None,
    report_date: date | None = None,
) -> DailyReport:
    """Generate (or regenerate) a daily report for the given date."""
    if report_date is None:
        report_date = date.today()

    # Get campaign name for AI context
    campaign_name = "All Campaigns"
    if campaign_id:
        camp_result = await db.execute(select(Campaign.name).where(Campaign.id == campaign_id))
        campaign_name = camp_result.scalar_one_or_none() or campaign_id

    stats = await _collect_stats(db, user_id, campaign_id, report_date)
    insights, recommendations = await _generate_ai_insights(stats, campaign_name)

    # Upsert report
    existing = await db.execute(
        select(DailyReport).where(
            and_(
                DailyReport.user_id == user_id,
                DailyReport.campaign_id == campaign_id,
                DailyReport.report_date == report_date,
            )
        )
    )
    report = existing.scalar_one_or_none()

    if report:
        # Update existing
        for k, v in stats.items():
            setattr(report, k, v)
        report.insights = insights
        report.recommendations = recommendations
    else:
        report = DailyReport(
            id=str(uuid.uuid4()),
            user_id=user_id,
            campaign_id=campaign_id,
            report_date=report_date,
            insights=insights,
            recommendations=recommendations,
            **stats,
        )
        db.add(report)

    await db.commit()
    await db.refresh(report)
    return report
