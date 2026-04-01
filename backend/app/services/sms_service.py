"""
SMS follow-up service via Twilio.
Short personalised messages sent after calls with INTERESTED/VOICEMAIL/CALLBACK dispositions.
"""

import httpx
from app.config import settings


def _build_sms_body(
    contact_name: str,
    business_name: str,
    campaign_objective: str,
    disposition: str,
) -> str:
    """Build a short SMS follow-up message (160 chars target)."""
    name = contact_name or business_name or "there"

    if disposition == "VOICEMAIL":
        return (
            f"Hi {name}, we tried calling earlier about {campaign_objective}. "
            "Reply YES to learn more or STOP to opt out."
        )
    elif disposition == "CALLBACK_REQUESTED":
        return (
            f"Hi {name}, following up on our call — happy to connect at your convenience. "
            "Reply to schedule. Reply STOP to opt out."
        )
    else:  # INTERESTED
        return (
            f"Hi {name}, great speaking! As discussed, reply to this message or check your "
            "email for next steps. Reply STOP to opt out."
        )


async def send_sms(to_phone: str, body: str) -> dict:
    """Send SMS via Twilio REST API. Returns {ok, sid, error}."""
    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    from_number = settings.TWILIO_FROM_NUMBER

    if not all([account_sid, auth_token, from_number]):
        print(f"[sms_service] Twilio credentials not set — skipping SMS to {to_phone}")
        return {"ok": False, "error": "Twilio credentials not configured"}

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                url,
                auth=(account_sid, auth_token),
                data={"To": to_phone, "From": from_number, "Body": body},
            )
            resp.raise_for_status()
            data = resp.json()
            return {"ok": True, "sid": data.get("sid")}
    except Exception as e:
        print(f"[sms_service] Send failed to {to_phone}: {e}")
        return {"ok": False, "error": str(e)}


async def send_follow_up_sms(
    to_phone: str,
    contact_name: str,
    business_name: str,
    campaign_objective: str,
    disposition: str,
) -> dict:
    body = _build_sms_body(contact_name, business_name, campaign_objective, disposition)
    return await send_sms(to_phone, body)
