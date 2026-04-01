import { auth } from "@/lib/auth-mock";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Phone, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  CONFIGURED: "bg-blue-100 text-blue-700",
  RUNNING: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function CampaignsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  const campaigns = user
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm"
        >
          <Plus className="h-4 w-4" /> New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed rounded-xl">
          <Phone className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-lg font-medium mb-2">No campaigns yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first outbound AI calling campaign.
          </p>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm"
          >
            <Plus className="h-4 w-4" /> Create Campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const totalContacts = campaign.contacts.reduce(
              (sum, cl) => sum + cl._count.contacts,
              0
            );
            return (
              <div
                key={campaign.id}
                className="border rounded-lg p-5 flex items-center gap-4 hover:bg-accent/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-base truncate">{campaign.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        STATUS_COLORS[campaign.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                  {campaign.objective && (
                    <p className="text-sm text-muted-foreground truncate">
                      {campaign.objective}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{totalContacts} contacts</span>
                    <span>{campaign._count.calls} calls</span>
                    <span>
                      Created {new Date(campaign.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/campaigns/${campaign.id}/calls`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline shrink-0"
                >
                  View Calls <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
