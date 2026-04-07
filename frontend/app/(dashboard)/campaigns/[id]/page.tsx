import { auth } from "@/lib/auth-mock";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CallDetailRow } from "@/components/calls/CallDetailRow";
import { Phone, BarChart2, Clock, TrendingUp, DollarSign, ArrowLeft, Pause, Play, FileText } from "lucide-react";

const DISPOSITION_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  CALLED: "bg-slate-100 text-slate-600",
  INTERESTED: "bg-green-100 text-green-700",
  NOT_INTERESTED: "bg-red-100 text-red-700",
  VOICEMAIL: "bg-yellow-100 text-yellow-700",
  NO_ANSWER: "bg-orange-100 text-orange-700",
  DNC: "bg-red-200 text-red-800",
  CALLBACK_REQUESTED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  CONVERTED: "bg-emerald-100 text-emerald-700",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  CONFIGURED: "bg-blue-100 text-blue-700",
  RUNNING: "bg-green-100 text-green-700 animate-pulse",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-purple-100 text-purple-700",
};

function formatDuration(secs: number | null): string {
  if (!secs || secs === 0) return "0s";
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatDate(dt: Date | null): string {
  if (!dt) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(new Date(dt));
}

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/");

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      contacts: {
        include: { _count: { select: { contacts: true } } },
      },
    },
  });

  if (!campaign) redirect("/campaigns");

  const calls = await prisma.call.findMany({
    where: { campaignId: params.id },
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      recording: true,
      transcript: true,
      summary: true,
      appointment: true,
    },
  });

  // ── Statistics ──────────────────────────────────────────────────────────
  const totalCalls = calls.length;
  const connected = calls.filter(
    (c) => c.status === "COMPLETED" && (c.duration ?? 0) > 0
  ).length;
  const interested = calls.filter((c) => c.disposition === "INTERESTED").length;
  const confirmed = calls.filter((c) => c.disposition === "CONFIRMED").length;
  const converted = calls.filter((c) => c.disposition === "CONVERTED").length;
  const totalCostCents = calls.reduce((s, c) => s + (c.costCents ?? 0), 0);

  const connectionRate = totalCalls > 0 ? ((connected / totalCalls) * 100).toFixed(1) : "0";
  const interestRate = connected > 0 ? ((interested / connected) * 100).toFixed(1) : "0";

  // ── Disposition distribution ────────────────────────────────────────────
  const dispCounts: Record<string, number> = {};
  for (const c of calls) {
    const d = c.disposition || "PENDING";
    dispCounts[d] = (dispCounts[d] ?? 0) + 1;
  }

  const totalContacts = campaign.contacts?.reduce(
    (s, cl) => s + (cl._count?.contacts ?? 0),
    0
  ) ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/campaigns" className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{campaign.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[campaign.status] ?? "bg-gray-100 text-gray-600"}`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{campaign.objective || "No objective set"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/reports?campaign=${params.id}`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-md hover:bg-accent"
          >
            <FileText className="w-3.5 h-3.5" />
            Report
          </Link>
          {campaign.status === "RUNNING" && (
            <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md hover:bg-yellow-100">
              <Pause className="w-3.5 h-3.5" />
              Pause
            </button>
          )}
          {campaign.status === "PAUSED" && (
            <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-md hover:bg-green-100">
              <Play className="w-3.5 h-3.5" />
              Resume
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total Calls", value: totalCalls, icon: <Phone className="w-4 h-4" />, color: "text-blue-600" },
          { label: "Connection Rate", value: `${connectionRate}%`, icon: <TrendingUp className="w-4 h-4" />, color: "text-green-600" },
          { label: "Interest Rate", value: `${interestRate}%`, icon: <BarChart2 className="w-4 h-4" />, color: "text-orange-500" },
          { label: "Confirmed", value: confirmed, icon: <TrendingUp className="w-4 h-4" />, color: "text-indigo-600" },
          { label: "Converted", value: converted, icon: <TrendingUp className="w-4 h-4" />, color: "text-emerald-600" },
          { label: "Total Cost", value: `$${(totalCostCents / 100).toFixed(2)}`, icon: <DollarSign className="w-4 h-4" />, color: "text-gray-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border rounded-xl p-4">
            <div className={`mb-1 ${stat.color}`}>{stat.icon}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Disposition distribution */}
      {Object.keys(dispCounts).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(dispCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([disp, count]) => (
              <span
                key={disp}
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${DISPOSITION_COLORS[disp] ?? "bg-gray-100 text-gray-600"}`}
              >
                {disp} · {count}
              </span>
            ))}
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-500">
            {totalContacts} contacts total
          </span>
        </div>
      )}

      {/* Call list */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-semibold">Call Records ({totalCalls})</h2>
          <Link
            href={`/campaigns/${params.id}/calls`}
            className="text-xs text-primary hover:underline"
          >
            Full call list →
          </Link>
        </div>

        {calls.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No calls yet. Launch the campaign to start calling.
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_140px_100px_100px_120px_auto] gap-3 px-5 py-2.5 text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/10">
              <span>Contact</span>
              <span>Outbound #</span>
              <span>Started</span>
              <span>Duration</span>
              <span>Disposition</span>
              <span>Details</span>
            </div>

            <div className="divide-y">
              {calls.map((call) => (
                <CallDetailRow
                  key={call.id}
                  call={call as unknown as Parameters<typeof CallDetailRow>[0]["call"]}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
