import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { phone, assistantId } = await req.json();

  if (!phone) {
    return NextResponse.json({ error: "Phone number required" }, { status: 400 });
  }

  const vapiKey = process.env.VAPI_API_KEY;
  const vapiPhoneId = process.env.VAPI_PHONE_NUMBER_ID;

  if (!vapiKey || vapiKey === "REPLACE_ME") {
    return NextResponse.json(
      { error: "Vapi not configured. Add VAPI_API_KEY and VAPI_PHONE_NUMBER_ID to .env.local" },
      { status: 503 }
    );
  }

  const body: Record<string, unknown> = {
    phoneNumberId: vapiPhoneId,
    customer: { number: phone },
  };
  if (assistantId) body.assistantId = assistantId;

  try {
    const res = await fetch("https://api.vapi.ai/call/phone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vapiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.message ?? "Vapi call failed" }, { status: res.status });
    }

    return NextResponse.json({ callId: data.id, status: data.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Call failed" },
      { status: 500 }
    );
  }
}
