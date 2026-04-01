import { auth } from "@/lib/auth-mock";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getAuthorizedCampaign(userId: string, campaignId: string) {
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return null;
  return prisma.campaign.findFirst({
    where: { id: campaignId, userId: user.id },
    include: {
      _count: { select: { calls: true } },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await getAuthorizedCampaign(userId, params.id);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(campaign);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await getAuthorizedCampaign(userId, params.id);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const allowed = [
    "name",
    "description",
    "status",
    "objective",
    "targetAudience",
    "talkingPoints",
    "agentConfig",
    "script",
    "vapiAssistantId",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await getAuthorizedCampaign(userId, params.id);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.campaign.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
