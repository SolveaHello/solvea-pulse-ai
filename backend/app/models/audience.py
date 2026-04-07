"""
Line B — User Operations data models.
AudienceUser: stores imported customer behavioral data.
RFMScore: computed RFM values per user.
AudienceCampaign: Line B batch email/SMS campaigns targeting RFM segments.
"""

from datetime import datetime, date
import enum
from sqlalchemy import String, DateTime, JSON, Enum as SAEnum, ForeignKey, Integer, Float, Date, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class RFMSegment(str, enum.Enum):
    CHAMPIONS = "CHAMPIONS"
    LOYAL = "LOYAL"
    POTENTIAL = "POTENTIAL"
    AT_RISK = "AT_RISK"
    CANT_LOSE = "CANT_LOSE"
    LOST = "LOST"
    UNSCORED = "UNSCORED"


class AudienceCampaignStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    PAUSED = "PAUSED"


class AudienceUser(Base):
    """Imported customer record used for RFM scoring and Line B campaigns."""
    __tablename__ = "audience_users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False)          # app user / team owner
    external_id: Mapped[str | None] = mapped_column(String, nullable=True)  # customer id in source system
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    # RFM raw inputs
    last_purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    total_spent_cents: Mapped[int] = mapped_column(Integer, default=0)   # stored in cents
    # Computed segment
    segment: Mapped[RFMSegment] = mapped_column(SAEnum(RFMSegment), default=RFMSegment.UNSCORED)
    segment_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Custom tags from import
    tags: Mapped[list] = mapped_column(JSON, default=list)
    custom_fields: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # DNC
    is_dnc: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    rfm_score: Mapped["RFMScore | None"] = relationship("RFMScore", back_populates="audience_user", uselist=False)
    follow_ups: Mapped[list["AudienceFollowUp"]] = relationship("AudienceFollowUp", back_populates="audience_user")


class RFMScore(Base):
    """Computed RFM scores for an AudienceUser. Recalculated daily."""
    __tablename__ = "rfm_scores"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    audience_user_id: Mapped[str] = mapped_column(String, ForeignKey("audience_users.id"), unique=True)
    r_score: Mapped[int] = mapped_column(Integer, default=0)   # 1–5 (5 = most recent)
    f_score: Mapped[int] = mapped_column(Integer, default=0)   # 1–5 (5 = most frequent)
    m_score: Mapped[int] = mapped_column(Integer, default=0)   # 1–5 (5 = highest spend)
    composite_score: Mapped[float] = mapped_column(Float, default=0.0)
    recency_days: Mapped[int | None] = mapped_column(Integer, nullable=True)  # days since last purchase
    calculated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    audience_user: Mapped["AudienceUser"] = relationship("AudienceUser", back_populates="rfm_score")


class AudienceCampaign(Base):
    """Line B batch marketing campaign targeting one or more RFM segments."""
    __tablename__ = "audience_campaigns"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    target_segments: Mapped[list] = mapped_column(JSON, default=list)    # list of RFMSegment values
    channel: Mapped[str] = mapped_column(String, nullable=False)          # EMAIL | SMS | BOTH
    subject: Mapped[str | None] = mapped_column(String, nullable=True)
    content_template: Mapped[str | None] = mapped_column(Text, nullable=True)   # Claude-generated template
    status: Mapped[AudienceCampaignStatus] = mapped_column(
        SAEnum(AudienceCampaignStatus), default=AudienceCampaignStatus.DRAFT
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    opened_count: Mapped[int] = mapped_column(Integer, default=0)
    clicked_count: Mapped[int] = mapped_column(Integer, default=0)
    replied_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    follow_ups: Mapped[list["AudienceFollowUp"]] = relationship("AudienceFollowUp", back_populates="campaign")


class AudienceFollowUp(Base):
    """Individual send record for Line B campaigns."""
    __tablename__ = "audience_follow_ups"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    audience_user_id: Mapped[str] = mapped_column(String, ForeignKey("audience_users.id"), nullable=False)
    campaign_id: Mapped[str] = mapped_column(String, ForeignKey("audience_campaigns.id"), nullable=False)
    channel: Mapped[str] = mapped_column(String, nullable=False)          # EMAIL | SMS
    subject: Mapped[str | None] = mapped_column(String, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    rfm_segment: Mapped[str | None] = mapped_column(String, nullable=True)  # which segment triggered this
    status: Mapped[str] = mapped_column(String, default="PENDING")        # PENDING|SENT|OPENED|CLICKED|REPLIED|FAILED
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    clicked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    replied_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    audience_user: Mapped["AudienceUser"] = relationship("AudienceUser", back_populates="follow_ups")
    campaign: Mapped["AudienceCampaign"] = relationship("AudienceCampaign", back_populates="follow_ups")
