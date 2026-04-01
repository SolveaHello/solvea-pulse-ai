"""
Vapi.ai REST API wrapper.
- Assistant creation
- Batch outbound call orchestration with concurrency control
- Call management
"""

import asyncio
from typing import Any
import httpx
from app.config import settings

VAPI_BASE = "https://api.vapi.ai"
MAX_CONCURRENT_CALLS = 10


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.VAPI_API_KEY}",
        "Content-Type": "application/json",
    }


async def create_assistant(
    name: str,
    script: str,
    agent_config: dict,
    webhook_url: str,
) -> dict:
    """Create a Vapi AI assistant and return the full response dict."""
    voice_config = _build_voice_config(agent_config)
    payload = {
        "name": name,
        "model": {
            "provider": "anthropic",
            "model": "claude-sonnet-4-6",
            "messages": [{"role": "system", "content": script}],
        },
        "voice": voice_config,
        "firstMessage": agent_config.get(
            "firstMessage",
            "Hi, I'm calling on behalf of our company. Is this a good time to talk?",
        ),
        "endCallFunctionEnabled": True,
        "recordingEnabled": True,
        "serverUrl": webhook_url,
        "serverUrlSecret": settings.VAPI_API_KEY[:16],  # used for webhook validation
        "functions": [_book_appointment_function()],
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{VAPI_BASE}/assistant", headers=_headers(), json=payload
        )
        resp.raise_for_status()
        return resp.json()


async def create_call(
    assistant_id: str,
    phone_number_id: str,
    customer_phone: str,
    customer_name: str | None = None,
    metadata: dict | None = None,
) -> dict:
    """Create a single outbound call."""
    payload: dict[str, Any] = {
        "assistantId": assistant_id,
        "phoneNumberId": phone_number_id,
        "customer": {"number": customer_phone},
    }
    if customer_name:
        payload["customer"]["name"] = customer_name
    if metadata:
        payload["metadata"] = metadata

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{VAPI_BASE}/call", headers=_headers(), json=payload
        )
        resp.raise_for_status()
        return resp.json()


async def batch_create_calls(
    assistant_id: str,
    phone_number_id: str,
    contacts: list[dict],
    on_call_created: Any = None,
) -> list[dict]:
    """
    Create outbound calls for a list of contacts with concurrency control.
    contacts: list of dicts with keys: id, phone, name (optional)
    on_call_created: async callback(contact_id, vapi_call_id)
    """
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_CALLS)
    results = []

    async def _create_one(contact: dict) -> dict:
        async with semaphore:
            try:
                result = await create_call(
                    assistant_id=assistant_id,
                    phone_number_id=phone_number_id,
                    customer_phone=contact["phone"],
                    customer_name=contact.get("name"),
                    metadata={"contactId": contact["id"]},
                )
                vapi_call_id = result.get("id")
                if on_call_created and vapi_call_id:
                    await on_call_created(contact["id"], vapi_call_id)
                return {"contactId": contact["id"], "vapiCallId": vapi_call_id, "ok": True}
            except Exception as e:
                return {"contactId": contact["id"], "ok": False, "error": str(e)}

    results = await asyncio.gather(*[_create_one(c) for c in contacts])
    return list(results)


async def get_call(call_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{VAPI_BASE}/call/{call_id}", headers=_headers())
        resp.raise_for_status()
        return resp.json()


def _build_voice_config(agent_config: dict) -> dict:
    provider = agent_config.get("voiceProvider", "elevenlabs")
    voice_id = agent_config.get("voiceId", "21m00Tcm4TlvDq8ikWAM")
    speed = agent_config.get("speed", 1.0)

    config: dict[str, Any] = {"provider": provider}
    if provider == "elevenlabs":
        config["voiceId"] = voice_id
        config["speed"] = speed
    elif provider == "openai":
        config["voiceId"] = voice_id
        config["speed"] = speed
    elif provider == "playht":
        config["voiceId"] = voice_id
    return config


def _book_appointment_function() -> dict:
    """Vapi function definition that the AI can call to book a calendar meeting."""
    return {
        "name": "bookAppointment",
        "description": (
            "Book a meeting on Google Calendar when the prospect is interested. "
            "Call this when the customer agrees to schedule a meeting."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "attendeeName": {
                    "type": "string",
                    "description": "The prospect's full name",
                },
                "attendeeEmail": {
                    "type": "string",
                    "description": "The prospect's email address if provided",
                },
                "preferredTime": {
                    "type": "string",
                    "description": "When the prospect wants to meet (e.g. 'tomorrow at 2pm', 'next Monday morning')",
                },
                "topic": {
                    "type": "string",
                    "description": "Brief description of what the meeting is about",
                },
            },
            "required": ["attendeeName", "preferredTime", "topic"],
        },
    }
