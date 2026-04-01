import { auth } from "@/lib/auth-mock";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json([]);

  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { calls: true } },
    },
  });

  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    // Auto-create user record on first campaign creation
    user = await prisma.user.create({
      data: { clerkId: userId, email: `${userId}@placeholder.com` },
    });
  }

  const body = await req.json();
  const campaign = await prisma.campaign.create({
    data: {
      userId: user.id,
      name: body.name || "New Campaign",
      objective: body.objective || "",
      targetAudience: body.targetAudience,
      talkingPoints: body.talkingPoints || [],
      agentConfig: body.agentConfig || {},
      script: body.script || "",
      status: "DRAFT",
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}
