import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function verifyVapiSignature(body: string, signature: string): boolean {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) return true; // Skip in dev if not set

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex")
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-vapi-signature") ?? "";

  if (!verifyVapiSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const { type, call } = event;
  const vapiCallId: string = call?.id;

  if (!vapiCallId || !type) {
    return NextResponse.json({ ok: true });
  }

  // Idempotency check
  try {
    await prisma.processedWebhookEvent.create({
      data: { vapiCallId, eventType: type },
    });
  } catch {
    // Duplicate — already processed
    return NextResponse.json({ ok: true });
  }

  // Proxy to FastAPI for heavy processing
  fetch(`${process.env.FASTAPI_INTERNAL_URL}/api/v1/webhooks/vapi/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch(console.error);

  // Handle immediate DB updates in BFF for latency-sensitive events
  switch (type) {
    case "call-started": {
      const dbCall = await prisma.call.findFirst({ where: { vapiCallId } });
      if (dbCall) {
        await prisma.call.update({
          where: { id: dbCall.id },
          data: { status: "IN_PROGRESS", startedAt: new Date() },
        });
      }
      break;
    }
    case "call-ended": {
      const dbCall = await prisma.call.findFirst({ where: { vapiCallId } });
      if (dbCall) {
        await prisma.call.update({
          where: { id: dbCall.id },
          data: {
            status: call.status === "ended" ? "COMPLETED" : "FAILED",
            duration: call.duration,
            endedAt: new Date(),
            endReason: call.endedReason,
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
