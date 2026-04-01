import { auth } from "@/lib/auth-mock";
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

  try {
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: phone, channel: "sms" });

    return NextResponse.json({ sent: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send code";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
