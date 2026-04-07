"""
RFM (Recency, Frequency, Monetary) scoring engine for Line B user operations.

Scoring logic:
- R (Recency):   days since last purchase — fewer days → higher score
- F (Frequency): total order count — more orders → higher score
- M (Monetary):  total spend in cents — higher spend → higher score

Each dimension is binned into 1–5 quantile buckets across all users.
Composite score = 0.4*R + 0.3*F + 0.3*M (weighted average, 1–5 range)

Segment assignment:
  Champions    R≥4 AND F≥4 AND M≥4
  Loyal        F≥4 AND M≥3 (regardless of R)
  Potential    R≥4 AND F<=2
  At Risk      R<=2 AND (F>=3 OR M>=3)
  Can't Lose   M>=4 AND R<=2
  Lost         R<=1 AND F<=2 AND M<=2
  (Can't Lose takes priority over At Risk for high-M users)
"""

import uuid
from datetime import date, datetime
from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.audience import AudienceUser, RFMScore, RFMSegment


def _quantile_bins(values: list[float], n_bins: int = 5) -> list[int]:
    """
    Assign 1–n_bins scores to each value.
    Higher values → higher score for F and M.
    Returns parallel list of scores.
    """
    if not values:
        return []
    sorted_vals = sorted(set(values))
    n = len(sorted_vals)
    if n == 1:
        return [3] * len(values)   # single value → mid score

    def score_for(v: float) -> int:
        rank = sorted_vals.index(v) / max(n - 1, 1)  # 0.0 – 1.0
        return max(1, min(n_bins, int(rank * n_bins) + 1))

    return [score_for(v) for v in values]


def _recency_bins(days_list: list[int], n_bins: int = 5) -> list[int]:
    """Recency: fewer days → higher score (invert the bin)."""
    inverted = [-d for d in days_list]  # negate so sort order matches high-score = recent
    raw = _quantile_bins(inverted, n_bins)
    return raw


def _determine_segment(r: int, f: int, m: int) -> RFMSegment:
    if m >= 4 and r <= 2:
        return RFMSegment.CANT_LOSE
    if r >= 4 and f >= 4 and m >= 4:
        return RFMSegment.CHAMPIONS
    if f >= 4 and m >= 3:
        return RFMSegment.LOYAL
    if r >= 4 and f <= 2:
        return RFMSegment.POTENTIAL
    if r <= 2 and (f >= 3 or m >= 3):
        return RFMSegment.AT_RISK
    if r <= 1 and f <= 2 and m <= 2:
        return RFMSegment.LOST
    # Default: treat mid-range as Potential
    return RFMSegment.POTENTIAL


async def recalculate_all(db: AsyncSession, user_id: str) -> dict:
    """
    Recalculate RFM scores for all AudienceUsers belonging to user_id.
    Returns a summary dict with segment counts.
    """
    result = await db.execute(
        select(AudienceUser).where(
            AudienceUser.user_id == user_id,
            AudienceUser.is_dnc == False,
        )
    )
    users: Sequence[AudienceUser] = result.scalars().all()

    if not users:
        return {"total": 0, "segments": {}}

    today = date.today()

    # Collect raw values
    recency_days: list[int] = []
    frequencies: list[float] = []
    monetaries: list[float] = []

    for u in users:
        if u.last_purchase_date:
            days = (today - u.last_purchase_date).days
        else:
            days = 9999  # never purchased → max recency
        recency_days.append(days)
        frequencies.append(float(u.total_orders))
        monetaries.append(float(u.total_spent_cents))

    r_scores = _recency_bins(recency_days)
    f_scores = _quantile_bins(frequencies)
    m_scores = _quantile_bins(monetaries)

    segment_counts: dict[str, int] = {}
    now = datetime.utcnow()

    for i, u in enumerate(users):
        r, f, m = r_scores[i], f_scores[i], m_scores[i]
        composite = round(0.4 * r + 0.3 * f + 0.3 * m, 2)
        segment = _determine_segment(r, f, m)

        # Upsert RFMScore
        score_result = await db.execute(
            select(RFMScore).where(RFMScore.audience_user_id == u.id)
        )
        score = score_result.scalar_one_or_none()
        if score:
            score.r_score = r
            score.f_score = f
            score.m_score = m
            score.composite_score = composite
            score.recency_days = recency_days[i] if recency_days[i] < 9999 else None
            score.calculated_at = now
        else:
            score = RFMScore(
                id=str(uuid.uuid4()),
                audience_user_id=u.id,
                r_score=r,
                f_score=f,
                m_score=m,
                composite_score=composite,
                recency_days=recency_days[i] if recency_days[i] < 9999 else None,
                calculated_at=now,
            )
            db.add(score)

        # Update user segment
        old_segment = u.segment
        u.segment = segment
        u.segment_updated_at = now

        seg_key = segment.value
        segment_counts[seg_key] = segment_counts.get(seg_key, 0) + 1

    await db.commit()

    return {
        "total": len(users),
        "calculatedAt": now.isoformat(),
        "segments": segment_counts,
    }


async def get_segment_summary(db: AsyncSession, user_id: str) -> list[dict]:
    """Return count of users per RFM segment."""
    result = await db.execute(
        select(AudienceUser.segment, func.count(AudienceUser.id))
        .where(AudienceUser.user_id == user_id)
        .group_by(AudienceUser.segment)
    )
    rows = result.all()

    segment_meta = {
        RFMSegment.CHAMPIONS:  {"label": "Champions",   "emoji": "🏆", "color": "emerald"},
        RFMSegment.LOYAL:      {"label": "Loyal",       "emoji": "💛", "color": "yellow"},
        RFMSegment.POTENTIAL:  {"label": "Potential",   "emoji": "🌱", "color": "blue"},
        RFMSegment.AT_RISK:    {"label": "At Risk",     "emoji": "⚠️",  "color": "orange"},
        RFMSegment.CANT_LOSE:  {"label": "Can't Lose",  "emoji": "🚨", "color": "red"},
        RFMSegment.LOST:       {"label": "Lost",        "emoji": "💤", "color": "gray"},
        RFMSegment.UNSCORED:   {"label": "Unscored",    "emoji": "⬜", "color": "slate"},
    }

    return [
        {
            "segment": seg.value,
            **segment_meta.get(seg, {"label": seg.value, "emoji": "", "color": "gray"}),
            "count": count,
        }
        for seg, count in rows
    ]
