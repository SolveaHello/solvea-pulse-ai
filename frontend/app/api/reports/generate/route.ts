import { auth } from "@/lib/auth-mock";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const { campaignId, reportDate } = body;

  // Delegate to FastAPI backend
  const fastapiUrl = process.env.FASTAPI_INTERNAL_URL || "http://localhost:8000";
  const res = await fetch(`${fastapiUrl}/api/v1/reports/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.id,
      campaignId: campaignId || null,
      reportDate: reportDate || null,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const report = await res.json();
  return NextResponse.json(report);
}
