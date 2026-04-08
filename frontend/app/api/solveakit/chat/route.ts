import { NextRequest, NextResponse } from "next/server";

const SOLVEAKIT_BASE_URL =
  process.env.SOLVEAKIT_BASE_URL ?? "https://desk-staging.shulex.com";

const CREATE_ENDPOINT = `${SOLVEAKIT_BASE_URL}/api_v3/solveakit/chat`;
const RESUME_ENDPOINT = `${SOLVEAKIT_BASE_URL}/api_v3/solveakit/chat/resume`;

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const sessionId =
      typeof body?.session_id === "string" ? body.session_id.trim() : "";

    if (!prompt) {
      return NextResponse.json(
        { error: "`prompt` is required." },
        { status: 400 }
      );
    }

    const endpoint = sessionId ? RESUME_ENDPOINT : CREATE_ENDPOINT;
    const upstreamPayload = sessionId ? { session_id: sessionId, prompt } : { prompt };

    const fixedCookie = process.env.SOLVEAKIT_COOKIE?.trim();
    const cookie = fixedCookie || req.headers.get("cookie");
    const authorization = req.headers.get("authorization");

    const upstreamHeaders = new Headers({
      "Content-Type": "application/json",
      Accept: "text/event-stream, application/json",
    });

    if (cookie) {
      upstreamHeaders.set("cookie", cookie);
    }
    if (authorization) {
      upstreamHeaders.set("authorization", authorization);
    }

    const upstreamRes = await fetch(endpoint, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify(upstreamPayload),
    });

    if (!upstreamRes.ok) {
      const errorText = await upstreamRes.text();
      return NextResponse.json(
        {
          error: "Upstream request failed",
          status: upstreamRes.status,
          details: errorText,
        },
        { status: upstreamRes.status }
      );
    }

    const contentType = upstreamRes.headers.get("content-type") ?? "";

    if (contentType.includes("text/event-stream") && upstreamRes.body) {
      return new Response(upstreamRes.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const data = await upstreamRes.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
