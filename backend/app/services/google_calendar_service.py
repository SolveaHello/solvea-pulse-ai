"""
Google Calendar API integration.
- Decrypt user OAuth tokens
- Check free/busy availability
- Create calendar events with Google Meet links
"""

import json
from datetime import datetime, timedelta
from typing import Optional
import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.config import settings


def _get_encryption_key() -> bytes:
    key_hex = settings.ENCRYPTION_KEY
    return bytes.fromhex(key_hex) if key_hex else b"\x00" * 32


def encrypt_tokens(tokens: dict) -> str:
    """AES-256-GCM encrypt OAuth tokens for DB storage."""
    key = _get_encryption_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    plaintext = json.dumps(tokens).encode()
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    # Store as base64(nonce + ciphertext)
    return base64.b64encode(nonce + ciphertext).decode()


def decrypt_tokens(encrypted: str) -> dict:
    """Decrypt stored OAuth tokens."""
    key = _get_encryption_key()
    aesgcm = AESGCM(key)
    raw = base64.b64decode(encrypted)
    nonce, ciphertext = raw[:12], raw[12:]
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return json.loads(plaintext)


def _build_service(token_data: dict):
    creds = Credentials(
        token=token_data.get("access_token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
    )
    return build("calendar", "v3", credentials=creds)


async def get_next_available_slot(
    encrypted_tokens: str,
    duration_minutes: int = 30,
    days_ahead: int = 7,
) -> Optional[tuple[datetime, datetime]]:
    """
    Find the next available N-minute slot within working hours (9am-5pm).
    Returns (start, end) tuple or None if no slot found.
    """
    token_data = decrypt_tokens(encrypted_tokens)
    service = _build_service(token_data)

    now = datetime.utcnow()
    time_max = now + timedelta(days=days_ahead)

    body = {
        "timeMin": now.isoformat() + "Z",
        "timeMax": time_max.isoformat() + "Z",
        "items": [{"id": "primary"}],
    }

    freebusy = service.freebusy().query(body=body).execute()
    busy_periods = [
        (
            datetime.fromisoformat(b["start"].rstrip("Z")),
            datetime.fromisoformat(b["end"].rstrip("Z")),
        )
        for b in freebusy["calendars"]["primary"].get("busy", [])
    ]

    # Check 30-min slots from now until time_max in working hours
    candidate = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    while candidate < time_max:
        # Working hours: 9am-5pm, Mon-Fri (UTC approx — ideally use user timezone)
        if candidate.weekday() < 5 and 9 <= candidate.hour < 17:
            slot_end = candidate + timedelta(minutes=duration_minutes)
            # Check overlap with busy periods
            overlaps = any(
                not (slot_end <= b_start or candidate >= b_end)
                for b_start, b_end in busy_periods
            )
            if not overlaps:
                return candidate, slot_end
        candidate += timedelta(minutes=30)

    return None


async def create_event(
    encrypted_tokens: str,
    title: str,
    start_time: datetime,
    end_time: datetime,
    description: str = "",
    attendee_email: Optional[str] = None,
    attendee_name: Optional[str] = None,
) -> dict:
    """Create a Google Calendar event with Google Meet link."""
    token_data = decrypt_tokens(encrypted_tokens)
    service = _build_service(token_data)

    event_body: dict = {
        "summary": title,
        "description": description,
        "start": {"dateTime": start_time.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": end_time.isoformat(), "timeZone": "UTC"},
        "conferenceData": {
            "createRequest": {
                "requestId": f"meet-{start_time.timestamp():.0f}",
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
    }

    if attendee_email:
        attendee: dict = {"email": attendee_email}
        if attendee_name:
            attendee["displayName"] = attendee_name
        event_body["attendees"] = [attendee]

    event = (
        service.events()
        .insert(
            calendarId="primary",
            body=event_body,
            conferenceDataVersion=1,
            sendUpdates="all" if attendee_email else "none",
        )
        .execute()
    )

    meeting_link = None
    if event.get("conferenceData"):
        entry_points = event["conferenceData"].get("entryPoints", [])
        for ep in entry_points:
            if ep.get("entryPointType") == "video":
                meeting_link = ep.get("uri")
                break

    return {
        "googleEventId": event["id"],
        "meetingLink": meeting_link,
        "startTime": start_time,
        "endTime": end_time,
        "htmlLink": event.get("htmlLink"),
    }
