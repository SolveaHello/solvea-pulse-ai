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


ANALYZE_REPLY_SYSTEM = """You are a sales follow-up analyst. Given a prospect's email reply,
determine their intent and suggest the next action.

Output a JSON object with exactly these fields:
{
  "intent": "confirm|reject|more_info|wrong_person|auto_reply",
  "confidence": 0.0,
  "suggestion": "confirm|reject|followup",
  "reasoning": "one sentence explaining the classification",
  "extractedInfo": {"email": "...", "phone": "...", "bestTime": "..."}
}

intent meanings:
- confirm: clearly wants to proceed / is interested
- reject: clearly not interested or unsubscribing
- more_info: asking questions, wants more details before deciding
- wrong_person: forwarded to someone else / wrong contact
- auto_reply: out-of-office or automated response

suggestion meanings:
- confirm: mark lead as CONFIRMED
- reject: mark lead as NOT_INTERESTED
- followup: send another follow-up, needs more nurturing

Output ONLY valid JSON."""


SCRIPT_INSIGHT_SYSTEM = """You are an expert sales coach. Given a daily report and the current call script,
suggest specific improvements to the script to improve connection and interest rates.

Output a JSON object with exactly these fields:
{
  "issues": ["issue 1", "issue 2"],
  "suggestions": [
    {"section": "opening|pitch|objection_handling|closing", "current": "...", "improved": "...", "reason": "..."}
  ],
  "overall_assessment": "brief 1-2 sentence assessment"
}
Output ONLY valid JSON."""


async def analyze_reply(reply_text: str, original_subject: str = "") -> dict:
    """Analyze a prospect's email reply and suggest confirm/reject action."""
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=ANALYZE_REPLY_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": f"Original subject: {original_subject}\n\nReply:\n{reply_text}",
            }
        ],
    )
    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


async def _generate_audience_content(segments: list[str], channel: str, objective: str) -> str:
    """Generate personalized marketing content for Line B audience campaigns."""
    segment_descriptions = {
        "CHAMPIONS": "highly engaged customers who buy frequently and spend the most",
        "LOYAL": "regular buyers with consistent spending",
        "POTENTIAL": "new or occasional buyers with growth potential",
        "AT_RISK": "previously active customers who have gone quiet recently",
        "CANT_LOSE": "high-value customers who have not purchased in a long time",
        "LOST": "inactive customers who need a strong reason to return",
    }
    seg_desc = "; ".join(
        f"{s}: {segment_descriptions.get(s, s)}" for s in segments
    )

    channel_instruction = (
        "Write a professional marketing email (subject line + body, max 300 words)"
        if channel == "EMAIL"
        else "Write a concise SMS message under 160 characters"
    )

    prompt = f"""Objective: {objective}
Target segments: {seg_desc}
Channel: {channel}

{channel_instruction}. Use {{name}} as a placeholder for the recipient's name.
Make the tone warm and relevant to the segment characteristics."""

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()


async def generate_script_insights(current_script: str, report_stats: dict, campaign_name: str) -> dict:
    """Analyze current script against performance data and suggest improvements."""
    prompt = f"""Campaign: {campaign_name}
Current script:
{current_script}

Performance stats:
- Connection rate: {report_stats.get('connection_rate', 0)}%
- Interest rate: {report_stats.get('interest_rate', 0)}%
- Total calls: {report_stats.get('total_calls', 0)}
- Not interested: {report_stats.get('not_interested_count', 0)}
- Voicemail: {report_stats.get('voicemail_count', 0)}"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SCRIPT_INSIGHT_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)
