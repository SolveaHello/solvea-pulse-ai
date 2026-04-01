import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const clerkUserId = searchParams.get("state");

  if (!code || !clerkUserId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_failed`
    );
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=token_exchange_failed`
    );
  }

  const tokens = await tokenRes.json();

  // Encrypt and store tokens in FastAPI backend
  const encryptRes = await fetch(
    `${process.env.FASTAPI_INTERNAL_URL}/api/v1/users/store-calendar-tokens`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clerkUserId, tokens }),
    }
  );

  if (!encryptRes.ok) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=store_failed`
    );
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/settings?connected=true`
  );
}
