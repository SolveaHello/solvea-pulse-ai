from datetime import datetime
from sqlalchemy import String, DateTime, JSON, Enum as SAEnum, ForeignKey, Integer, Boolean, Float, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.database import Base


class CampaignStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    CONFIGURED = "CONFIGURED"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class CallStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RINGING = "RINGING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    BUSY = "BUSY"
    NO_ANSWER = "NO_ANSWER"


class Disposition(str, enum.Enum):
    PENDING = "PENDING"
    CALLED = "CALLED"
    INTERESTED = "INTERESTED"
    NOT_INTERESTED = "NOT_INTERESTED"
    VOICEMAIL = "VOICEMAIL"
    NO_ANSWER = "NO_ANSWER"
    DNC = "DNC"
    CALLBACK_REQUESTED = "CALLBACK_REQUESTED"
    CONFIRMED = "CONFIRMED"    # agreed to cooperate, assigned to sales team
    CONVERTED = "CONVERTED"    # deal closed / registration complete


class SourceType(str, enum.Enum):
    GOOGLE_MAPS = "GOOGLE_MAPS"
    CSV_UPLOAD = "CSV_UPLOAD"
    MANUAL = "MANUAL"


class FollowUpChannel(str, enum.Enum):
    EMAIL = "EMAIL"
    SMS = "SMS"


class FollowUpStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    REPLIED = "REPLIED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[CampaignStatus] = mapped_column(
        SAEnum(CampaignStatus), default=CampaignStatus.DRAFT
    )
    objective: Mapped[str] = mapped_column(String, default="")
    script: Mapped[str] = mapped_column(String, default="")
    vapi_assistant_id: Mapped[str | None] = mapped_column(String, nullable=True)
    agent_config: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    calls: Mapped[list["Call"]] = relationship("Call", back_populates="campaign")
    contact_lists: Mapped[list["ContactList"]] = relationship(
        "ContactList", back_populates="campaign"
    )
    follow_ups: Mapped[list["FollowUp"]] = relationship("FollowUp", back_populates="campaign")
    daily_reports: Mapped[list["DailyReport"]] = relationship("DailyReport", back_populates="campaign")


class ContactList(Base):
    __tablename__ = "contact_lists"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    campaign_id: Mapped[str] = mapped_column(String, ForeignKey("campaigns.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    source_type: Mapped[SourceType] = mapped_column(SAEnum(SourceType))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="contact_lists")
    contacts: Mapped[list["Contact"]] = relationship("Contact", back_populates="contact_list")


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    contact_list_id: Mapped[str] = mapped_column(
        String, ForeignKey("contact_lists.id"), nullable=False
    )
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    business_name: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    website: Mapped[str | None] = mapped_column(String, nullable=True)
    place_id: Mapped[str | None] = mapped_column(String, nullable=True)
    custom_fields: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    disposition: Mapped[Disposition] = mapped_column(
        SAEnum(Disposition), default=Disposition.PENDING
    )
    assigned_to: Mapped[str | None] = mapped_column(String, nullable=True)  # sales rep user_id
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    converted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    contact_list: Mapped["ContactList"] = relationship(
        "ContactList", back_populates="contacts"
    )
    calls: Mapped[list["Call"]] = relationship("Call", back_populates="contact")
    follow_ups: Mapped[list["FollowUp"]] = relationship("FollowUp", back_populates="contact")


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    campaign_id: Mapped[str] = mapped_column(String, ForeignKey("campaigns.id"), nullable=False)
    contact_id: Mapped[str] = mapped_column(String, ForeignKey("contacts.id"), nullable=False)
    vapi_call_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    status: Mapped[CallStatus] = mapped_column(
        SAEnum(CallStatus), default=CallStatus.QUEUED
    )
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    disposition: Mapped[Disposition] = mapped_column(
        SAEnum(Disposition), default=Disposition.PENDING
    )
    cost_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="calls")
    contact: Mapped["Contact"] = relationship("Contact", back_populates="calls")
    recording: Mapped["Recording | None"] = relationship(
        "Recording", back_populates="call", uselist=False
    )
    transcript: Mapped["Transcript | None"] = relationship(
        "Transcript", back_populates="call", uselist=False
    )
    summary: Mapped["CallSummary | None"] = relationship(
        "CallSummary", back_populates="call", uselist=False
    )
    appointment: Mapped["Appointment | None"] = relationship(
        "Appointment", back_populates="call", uselist=False
    )
    follow_ups: Mapped[list["FollowUp"]] = relationship("FollowUp", back_populates="call")


class Recording(Base):
    __tablename__ = "recordings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    call_id: Mapped[str] = mapped_column(String, ForeignKey("calls.id"), unique=True)
    vapi_url: Mapped[str | None] = mapped_column(String, nullable=True)
    s3_key: Mapped[str | None] = mapped_column(String, nullable=True)
    s3_url: Mapped[str | None] = mapped_column(String, nullable=True)
    duration_secs: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    call: Mapped["Call"] = relationship("Call", back_populates="recording")


class Transcript(Base):
    __tablename__ = "transcripts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    call_id: Mapped[str] = mapped_column(String, ForeignKey("calls.id"), unique=True)
    raw_text: Mapped[str] = mapped_column(String)
    translated_text: Mapped[str | None] = mapped_column(String, nullable=True)
    language: Mapped[str | None] = mapped_column(String, nullable=True)
    messages: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    call: Mapped["Call"] = relationship("Call", back_populates="transcript")


class CallSummary(Base):
    __tablename__ = "call_summaries"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    call_id: Mapped[str] = mapped_column(String, ForeignKey("calls.id"), unique=True)
    summary: Mapped[str] = mapped_column(String)
    key_points: Mapped[list] = mapped_column(JSON, default=list)
    sentiment: Mapped[str | None] = mapped_column(String, nullable=True)
    next_action: Mapped[str | None] = mapped_column(String, nullable=True)
    extracted_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    call: Mapped["Call"] = relationship("Call", back_populates="summary")


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    call_id: Mapped[str] = mapped_column(String, ForeignKey("calls.id"), unique=True)
    google_event_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    google_calendar_id: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime)
    end_time: Mapped[datetime] = mapped_column(DateTime)
    attendee_email: Mapped[str | None] = mapped_column(String, nullable=True)
    attendee_name: Mapped[str | None] = mapped_column(String, nullable=True)
    meeting_link: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="confirmed")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    call: Mapped["Call"] = relationship("Call", back_populates="appointment")


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    contact_id: Mapped[str] = mapped_column(String, ForeignKey("contacts.id"), nullable=False)
    campaign_id: Mapped[str] = mapped_column(String, ForeignKey("campaigns.id"), nullable=False)
    call_id: Mapped[str | None] = mapped_column(String, ForeignKey("calls.id"), nullable=True)
    channel: Mapped[FollowUpChannel] = mapped_column(SAEnum(FollowUpChannel), nullable=False)
    status: Mapped[FollowUpStatus] = mapped_column(
        SAEnum(FollowUpStatus), default=FollowUpStatus.PENDING
    )
    subject: Mapped[str | None] = mapped_column(String, nullable=True)
    content: Mapped[str] = mapped_column(String, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    replied_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reply_content: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    contact: Mapped["Contact"] = relationship("Contact", back_populates="follow_ups")
    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="follow_ups")
    call: Mapped["Call | None"] = relationship("Call", back_populates="follow_ups")


class ScriptVersion(Base):
    """Versioned history of campaign scripts. Active version is what the AI uses."""
    __tablename__ = "script_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    campaign_id: Mapped[str] = mapped_column(String, ForeignKey("campaigns.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    script: Mapped[str] = mapped_column(String, nullable=False)
    change_summary: Mapped[str | None] = mapped_column(String, nullable=True)  # what changed
    ai_suggestions: Mapped[dict | None] = mapped_column(JSON, nullable=True)   # raw Claude output
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[str | None] = mapped_column(String, nullable=True)     # user_id who approved
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DailyReport(Base):
    __tablename__ = "daily_reports"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    campaign_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("campaigns.id"), nullable=True
    )
    report_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    total_calls: Mapped[int] = mapped_column(Integer, default=0)
    connected_calls: Mapped[int] = mapped_column(Integer, default=0)
    interested_count: Mapped[int] = mapped_column(Integer, default=0)
    not_interested_count: Mapped[int] = mapped_column(Integer, default=0)
    voicemail_count: Mapped[int] = mapped_column(Integer, default=0)
    no_answer_count: Mapped[int] = mapped_column(Integer, default=0)
    callback_count: Mapped[int] = mapped_column(Integer, default=0)
    confirmed_count: Mapped[int] = mapped_column(Integer, default=0)
    converted_count: Mapped[int] = mapped_column(Integer, default=0)
    follow_ups_sent: Mapped[int] = mapped_column(Integer, default=0)
    cost_cents: Mapped[int] = mapped_column(Integer, default=0)
    connection_rate: Mapped[float] = mapped_column(Float, default=0.0)
    interest_rate: Mapped[float] = mapped_column(Float, default=0.0)
    insights: Mapped[list] = mapped_column(JSON, default=list)
    recommendations: Mapped[list] = mapped_column(JSON, default=list)
    raw_stats: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    campaign: Mapped["Campaign | None"] = relationship("Campaign", back_populates="daily_reports")
