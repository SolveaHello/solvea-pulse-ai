from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import campaigns, contacts, webhooks, google_calendar, followups, reports, leads

app = FastAPI(title="Pulse AI — Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(campaigns.router)
app.include_router(contacts.router)
app.include_router(webhooks.router)
app.include_router(google_calendar.router)
app.include_router(followups.router)
app.include_router(reports.router)
app.include_router(leads.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
