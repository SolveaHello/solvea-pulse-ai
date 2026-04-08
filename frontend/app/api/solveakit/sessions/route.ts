import { NextResponse } from "next/server";

const SOLVEAKIT_BASE_URL =
  process.env.SOLVEAKIT_BASE_URL ?? "https://desk-staging.shulex.com";
const SESSIONS_PATH =
  process.env.SOLVEAKIT_SESSIONS_PATH ?? "/api_v3/solveakit/sessions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const fixedCookie = process.env.SOLVEAKIT_COOKIE?.trim();
    const cookie = fixedCookie || req.headers.get("cookie");
    const authorization = req.headers.get("authorization");

    const upstreamHeaders = new Headers({
      Accept: "application/json",
    });

    if (cookie) {
      upstreamHeaders.set("cookie", cookie);
    }
    if (authorization) {
      upstreamHeaders.set("authorization", authorization);
    }

    const endpoint = `${SOLVEAKIT_BASE_URL}${SESSIONS_PATH}`;
    const upstreamRes = await fetch(endpoint, {
      method: "GET",
      headers: upstreamHeaders,
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

    const data = await upstreamRes.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load sessions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
