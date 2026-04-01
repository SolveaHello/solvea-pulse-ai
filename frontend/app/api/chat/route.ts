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

## Card injection rules
When the user wants to find businesses, contacts, or addresses to call (mentions searching, finding leads, targeting local businesses, nearby places, etc.) — output EXACTLY this at the END of your message:
<show_card>map-search</show_card>

When you have the campaign name and objective AND the user has selected contacts — output EXACTLY this at the END of your message:
<show_card>outbound-number</show_card>

## Campaign data extraction
When you have: name, objective, targetAudience, talkingPoints, tone — output this EXACT block at the END:
<campaign_data>
{"name":"...","objective":"...","targetAudience":"...","talkingPoints":["...","...","..."],"tone":"professional|friendly|casual|energetic","restrictions":["..."]}
</campaign_data>

## Flow
1. Ask: what's the goal of this campaign? (one sentence)
2. If they want to search for contacts/businesses → inject map-search card
3. Once contacts are confirmed and you know the objective → inject outbound-number card
4. Once everything is set → output campaign_data

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
