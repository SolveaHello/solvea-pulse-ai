import OpenAI from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010",
    "X-Title": "Pulse AI",
  },
});

const SYSTEM_PROMPT = `You are a concise AI assistant helping users set up outbound calling campaigns.
Be brief and direct — 1-2 sentences per reply. Never ask multiple questions at once.

## Card injection rules — READ CAREFULLY

### map-search card
Inject EXACTLY ONCE per conversation: only the FIRST time the user indicates they want to find or search for businesses/leads.
<show_card>map-search</show_card>

NEVER inject this card again after it has already appeared. If the user is continuing the conversation after contacts are selected, do NOT emit this tag.
Conditions that DO trigger it (first time only): user mentions searching, finding leads, targeting businesses, looking for customers.
Conditions that NEVER trigger it: user says "ok", "sure", "yes", "sounds good", discusses objectives, asks about scripts, or continues after contacts are already set.

### outbound-number card
DEPRECATED — do not inject. Outbound number is now configured inside the map-search card.

## Campaign data extraction
When you have: name, objective, targetAudience, talkingPoints, tone — output this EXACT block at the END:
<campaign_data>
{"name":"...","objective":"...","targetAudience":"...","talkingPoints":["...","...","..."],"tone":"professional|friendly|casual|energetic","restrictions":["..."]}
</campaign_data>

## Flow
1. Ask: what's the goal of this campaign? (one sentence)
2. First time user wants to search for contacts → inject map-search card (ONCE ONLY)
3. Once contacts are confirmed → continue conversation, ask about script/tone/objective
4. Once name + objective + talkingPoints + tone are known → output campaign_data

Keep replies under 2 sentences. No lists of questions. Be action-oriented.`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";
      try {
        const response = await client.chat.completions.create({
          model: "anthropic/claude-3.5-haiku",
          max_tokens: 2048,
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          ],
        });

        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            fullContent += text;
            controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
          }
        }

        // Send show_card event if present
        const showCardMatch = fullContent.match(/<show_card>([\w-]+)<\/show_card>/);
        if (showCardMatch) {
          controller.enqueue(
            encoder.encode(
              `8:${JSON.stringify({ showCard: { type: showCardMatch[1] } })}\n`
            )
          );
        }

        // Send campaign extraction data if present
        const extractMatch = fullContent.match(
          /<campaign_data>\s*([\s\S]*?)\s*<\/campaign_data>/
        );
        if (extractMatch) {
          try {
            const extraction = JSON.parse(extractMatch[1]);
            controller.enqueue(
              encoder.encode(
                `8:${JSON.stringify({ campaignExtraction: extraction })}\n`
              )
            );
          } catch {
            // malformed JSON — ignore
          }
        }

        controller.enqueue(encoder.encode("d:{}\n"));
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `3:${JSON.stringify(
              err instanceof Error ? err.message : "Unknown error"
            )}\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "X-Vercel-AI-Data-Stream": "v1",
    },
  });
}
