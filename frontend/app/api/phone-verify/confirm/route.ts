import { auth } from "@/lib/auth-mock";
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone, code } = await req.json();
  if (!phone || !code)
    return NextResponse.json({ error: "Phone and code required" }, { status: 400 });

  try {
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: phone, code });

    if (check.status !== "approved") {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Get or create user record
    await prisma.user.upsert({
      where: { clerkId: userId },
      update: { verifiedPhone: phone, phoneVerifiedAt: new Date() },
      create: {
        clerkId: userId,
        email: `${userId}@placeholder.com`,
        verifiedPhone: phone,
        phoneVerifiedAt: new Date(),
      },
    });

    return NextResponse.json({ verified: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
