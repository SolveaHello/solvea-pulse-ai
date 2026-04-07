import { auth } from "@/lib/auth-mock";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CampaignsTabView } from "@/components/campaign/CampaignsTabView";
import type { OutboundCampaign } from "@/components/campaign/CampaignsTabView";

export default async function CampaignsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  const raw = user
    ? await prisma.campaign.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { calls: true } },
          contacts: {
            include: { _count: { select: { contacts: true } } },
          },
        },
      })
    : [];

  // Count answered calls (COMPLETED status) per campaign
  const answeredMap: Record<string, number> = {};
  if (raw.length > 0) {
    const answered = await prisma.call.groupBy({
      by: ["campaignId"],
      where: {
        campaignId: { in: raw.map((c) => c.id) },
        status: "COMPLETED",
      },
      _count: { id: true },
    });
    for (const row of answered) {
      answeredMap[row.campaignId] = row._count.id;
    }
  }

  const outbound: OutboundCampaign[] = raw.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    objective: c.objective ?? null,
    createdAt: c.createdAt,
    totalContacts: c.contacts.reduce((s, cl) => s + cl._count.contacts, 0),
    callCount: c._count.calls,
    answeredCount: answeredMap[c.id] ?? 0,
  }));

  return <CampaignsTabView outbound={outbound} />;
}
