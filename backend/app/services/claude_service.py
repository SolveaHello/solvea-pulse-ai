"""
All Anthropic Claude API calls.
- Call summarization (Haiku for cost efficiency at high volume)
- Translation detection and translation
"""

import json
from anthropic import AsyncAnthropic
from app.config import settings

client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

SUMMARIZE_SYSTEM = """You are an expert call analyzer. Given a phone call transcript between an AI sales agent and a prospect, output a JSON object with these exact fields:
{
  "summary": "2-3 sentence summary of the call",
  "sentiment": "positive|neutral|negative",
  "disposition": "INTERESTED|NOT_INTERESTED|VOICEMAIL|NO_ANSWER|CALLBACK_REQUESTED|CALLED",
  "keyPoints": ["point1", "point2", "..."],
  "nextAction": "what should be done next (or null)",
  "extractedData": {"email": "...", "companyName": "...", "decisionMaker": "..."}
}

extractedData should only contain fields that were explicitly mentioned in the call.
Output ONLY valid JSON, no commentary."""

TRANSLATE_SYSTEM = """Translate the following phone call transcript to English.
Preserve speaker labels (Agent:, Customer:) and keep the same structure.
Output ONLY the translated text."""

DETECT_LANGUAGE_SYSTEM = """Detect the primary language of this text.
Output ONLY the ISO 639-1 language code (e.g. 'en', 'es', 'fr', 'de', 'zh', 'ja').
No other output."""


async def summarize_call(transcript_text: str, campaign_objective: str) -> dict:
    """Summarize a call transcript. Uses Haiku for cost efficiency."""
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=SUMMARIZE_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": f"Campaign objective: {campaign_objective}\n\nTranscript:\n{transcript_text}",
            }
        ],
    )
    text = message.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


async def detect_language(text: str) -> str:
    """Detect language of text. Returns ISO 639-1 code."""
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=10,
        system=DETECT_LANGUAGE_SYSTEM,
        messages=[{"role": "user", "content": text[:500]}],
    )
    return message.content[0].text.strip().lower()


async def translate_to_english(text: str) -> str:
    """Translate call transcript to English."""
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        system=TRANSLATE_SYSTEM,
        messages=[{"role": "user", "content": text}],
    )
    return message.content[0].text.strip()
