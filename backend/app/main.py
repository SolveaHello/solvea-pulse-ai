from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import campaigns, contacts, webhooks, google_calendar, followups, reports, leads
from app.routers import audience, dashboard


# ─── APScheduler: daily background tasks ────────────────────────────────────

def _start_scheduler(app: FastAPI):
    """Start APScheduler with daily tasks if the library is installed."""
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = AsyncIOScheduler()

        async def _daily_report_job():
            """Auto-generate daily reports for all active users at 00:00."""
            from datetime import date
            from app.db.database import AsyncSessionLocal
            from app.services.report_service import generate_report
            from app.models.campaign import Campaign
            from sqlalchemy import select
            try:
                async with AsyncSessionLocal() as db:
                    result = await db.execute(select(Campaign.user_id).distinct())
                    user_ids = [row[0] for row in result.all()]
                    for uid in user_ids:
                        await generate_report(db, uid, campaign_id=None, report_date=date.today())
            except Exception as e:
                print(f"[scheduler] daily report failed: {e}")

        async def _daily_rfm_recalculate():
            """Recalculate RFM scores for all audience users at 00:05."""
            from app.db.database import AsyncSessionLocal
            from app.services.rfm_service import recalculate_all
            from app.models.audience import AudienceUser
            from sqlalchemy import select
            try:
                async with AsyncSessionLocal() as db:
                    result = await db.execute(select(AudienceUser.user_id).distinct())
                    user_ids = [row[0] for row in result.all()]
                    for uid in user_ids:
                        summary = await recalculate_all(db, uid)
                        print(f"[scheduler] RFM recalculated for user {uid}: {summary}")
            except Exception as e:
                print(f"[scheduler] RFM recalculation failed: {e}")

        # Daily at 00:00 — generate reports
        scheduler.add_job(_daily_report_job, CronTrigger(hour=0, minute=0))
        # Daily at 00:05 — recalculate RFM (after reports)
        scheduler.add_job(_daily_rfm_recalculate, CronTrigger(hour=0, minute=5))

        scheduler.start()
        app.state.scheduler = scheduler
        print("[scheduler] APScheduler started (daily report + RFM jobs)")

    except ImportError:
        print("[scheduler] APScheduler not installed — daily jobs disabled")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _start_scheduler(app)
    yield
    # Shutdown
    scheduler = getattr(app.state, "scheduler", None)
    if scheduler:
        scheduler.shutdown(wait=False)


# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(title="Pulse AI — Backend", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Line A — Outbound acquisition
app.include_router(campaigns.router)
app.include_router(contacts.router)
app.include_router(webhooks.router)
app.include_router(google_calendar.router)
app.include_router(followups.router)
app.include_router(reports.router)
app.include_router(leads.router)

# Line B — User operations
app.include_router(audience.router)

# Shared
app.include_router(dashboard.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
