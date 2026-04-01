import { auth } from "@/lib/auth-mock";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      contacts: {
        include: {
          contacts: { where: { disposition: "PENDING" } },
        },
      },
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!campaign.vapiAssistantId)
    return NextResponse.json({ error: "Configure agent before executing" }, { status: 400 });

  // Proxy to FastAPI to execute batch calls
  const fastapiRes = await fetch(
    `${process.env.FASTAPI_INTERNAL_URL}/api/v1/campaigns/${params.id}/batch-call`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assistantId: campaign.vapiAssistantId,
        vapiPhoneNumberId: user.vapiPhoneNumberId,
      }),
    }
  );

  if (!fastapiRes.ok) {
    const err = await fastapiRes.text();
    return NextResponse.json({ error: err }, { status: fastapiRes.status });
  }

  await prisma.campaign.update({
    where: { id: params.id },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const result = await fastapiRes.json();
  return NextResponse.json(result);
}
