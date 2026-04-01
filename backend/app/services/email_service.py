"""
Email follow-up service via Resend API.
- Claude generates personalised email content based on call summary
- Resend delivers the email
"""

import json
import httpx
from anthropic import AsyncAnthropic
from app.config import settings

anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

RESEND_BASE = "https://api.resend.com"

EMAIL_CONTENT_SYSTEM = """You are a professional B2B sales assistant writing follow-up emails after an outbound sales call.
Write a concise, warm follow-up email based on the call context provided.

Rules:
- Subject line: short, specific, not clickbait
- Body: 3-4 short paragraphs max
- Tone: professional but friendly
- Include a clear single CTA (book a call / reply to this email / visit link)
- Do NOT use generic filler phrases like "I hope this email finds you well"
- Personalise using the business name and any details from the call

Output a JSON object with exactly these fields:
{
  "subject": "...",
  "body": "..."
}
Output ONLY valid JSON."""


async def generate_email_content(
    contact_name: str,
    business_name: str,
    campaign_objective: str,
    call_summary: str,
    call_sentiment: str,
    next_action: str | None,
) -> dict:
    """Use Claude to generate personalised email subject + body."""
    prompt = f"""Contact: {contact_name or business_name}
Business: {business_name or "their business"}
Campaign objective: {campaign_objective}
Call summary: {call_summary}
Call sentiment: {call_sentiment}
Suggested next action: {next_action or "schedule a follow-up meeting"}"""

    message = await anthropic_client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=EMAIL_CONTENT_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


async def send_email(
    to_email: str,
    to_name: str,
    subject: str,
    body: str,
    from_name: str = "OutboundAI Team",
) -> dict:
    """Send email via Resend API. Returns {ok, messageId, error}."""
    if not settings.RESEND_API_KEY:
        print(f"[email_service] RESEND_API_KEY not set — skipping send to {to_email}")
        return {"ok": False, "error": "RESEND_API_KEY not configured"}

    from_email = settings.RESEND_FROM_EMAIL or "noreply@outboundai.com"

    payload = {
        "from": f"{from_name} <{from_email}>",
        "to": [f"{to_name} <{to_email}>" if to_name else to_email],
        "subject": subject,
        "text": body,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{RESEND_BASE}/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return {"ok": True, "messageId": data.get("id")}
    except Exception as e:
        print(f"[email_service] Send failed to {to_email}: {e}")
        return {"ok": False, "error": str(e)}
