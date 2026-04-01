import Link from "next/link";
import {
  Plus, Phone, Calendar, TrendingUp, Megaphone,
  Users, Mail, CheckCircle2, ArrowRight, PhoneCall,
  PhoneMissed, MessageSquare, ChevronRight, Video,
} from "lucide-react";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_CAMPAIGNS = [
  {
    id: "camp-1",
    name: "NYC Nail Salons Q1",
    status: "RUNNING",
    totalCalls: 83,
    connectedCalls: 50,
    interestedCount: 9,
    createdAt: "2026-03-28T09:00:00Z",
  },
  {
    id: "camp-2",
    name: "Beauty Lounges Brooklyn",
    status: "COMPLETED",
    totalCalls: 35,
    connectedCalls: 19,
    interestedCount: 6,
    createdAt: "2026-03-25T09:00:00Z",
  },
  {
    id: "camp-3",
    name: "Auto Services NYC",
    status: "COMPLETED",
    totalCalls: 48,
    connectedCalls: 31,
    interestedCount: 6,
    createdAt: "2026-03-22T09:00:00Z",
  },
];

const MOCK_FUNNEL = {
  totalCalls: 166,
  connectedCalls: 100,
  interested: 2,
  callbackRequested: 1,
  followUpsSent: 6,
  followUpsReplied: 1,
  confirmed: 1,
  converted: 1,
  appointments: 2,
};

const MOCK_APPOINTMENTS = [
  {
    id: "apt-1",
    title: "Demo call — Glow Beauty Lounge",
    attendeeName: "Lisa Patel",
    startTime: "2026-04-02T10:00:00Z",
    meetingLink: "#",
  },
  {
    id: "apt-2",
    title: "Onboarding — Kim's Auto Detail",
    attendeeName: "David Kim",
    startTime: "2026-04-03T14:00:00Z",
    meetingLink: "#",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const f = MOCK_FUNNEL;
  const connectionRate = Math.round((f.connectedCalls / f.totalCalls) * 100);
  const interestRate = Math.round((f.interested / f.connectedCalls) * 100);

  return (
    <div className="p-8 max-w-6xl">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Campaign performance at a glance
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Campaign
        </Link>
      </div>

      {/* ── Conversion funnel strip ───────────────────────────────── */}
      <div className="bg-muted/30 border rounded-xl px-6 py-5 mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Conversion Funnel — All Time
        </p>
        <div className="flex items-center gap-1">
          {/* Calls */}
          <FunnelStep
            href="/campaigns"
            label="Calls Made"
            value={f.totalCalls}
            sub={`${MOCK_CAMPAIGNS.length} campaigns`}
            color="bg-slate-100 text-slate-700 hover:bg-slate-200"
            icon={<Phone className="h-4 w-4" />}
          />
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />

          {/* Connected */}
          <FunnelStep
            href="/campaigns"
            label="Connected"
            value={f.connectedCalls}
            sub={`${connectionRate}% rate`}
            color="bg-blue-50 text-blue-700 hover:bg-blue-100"
            icon={<PhoneCall className="h-4 w-4" />}
          />
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />

          {/* Interested */}
          <FunnelStep
            href="/leads?disposition=INTERESTED"
            label="Interested"
            value={f.interested}
            sub={`${interestRate}% of connected`}
            color="bg-orange-50 text-orange-700 hover:bg-orange-100"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />

          {/* Follow-ups */}
          <FunnelStep
            href="/followups?status=SENT"
            label="Follow-ups"
            value={f.followUpsSent}
            sub={`${f.followUpsReplied} replied`}
            color="bg-sky-50 text-sky-700 hover:bg-sky-100"
            icon={<Mail className="h-4 w-4" />}
          />
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />

          {/* Confirmed */}
          <FunnelStep
            href="/leads?disposition=CONFIRMED"
            label="Confirmed"
            value={f.confirmed}
            sub="ready for sales"
            color="bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            icon={<Users className="h-4 w-4" />}
          />
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />

          {/* Converted */}
          <FunnelStep
            href="/leads?disposition=CONVERTED"
            label="Converted"
            value={f.converted}
            sub="deal closed"
            color="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* ── Main 3-column grid ────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_1fr_300px] gap-5">

        {/* ── Col 1: Campaigns ─────────────────────────────────────── */}
        <div className="border rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Campaigns</span>
            </div>
            <Link href="/campaigns" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex-1 divide-y">
            {MOCK_CAMPAIGNS.map((c) => {
              const connRate = Math.round((c.connectedCalls / c.totalCalls) * 100);
              return (
                <Link
                  key={c.id}
                  href={`/campaigns/${c.id}/calls`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>{c.totalCalls} calls</span>
                      <span>{connRate}% connected</span>
                      <span className="text-orange-600 font-medium">{c.interestedCount} interested</span>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                </Link>
              );
            })}
          </div>

          {/* Create new campaign CTA */}
          <Link
            href="/campaigns/new"
            className="flex items-center justify-center gap-2 px-5 py-3.5 border-t text-sm text-primary hover:bg-primary/5 transition-colors font-medium"
          >
            <Plus className="h-4 w-4" /> Create New Campaign
          </Link>
        </div>

        {/* ── Col 2: Leads + Follow-ups ─────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Leads breakdown */}
          <div className="border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Leads</span>
              </div>
              <Link href="/leads" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y">
              <LeadTile
                href="/leads?disposition=INTERESTED"
                label="Interested"
                value={f.interested}
                color="text-orange-600"
                bg="hover:bg-orange-50"
                icon={<TrendingUp className="h-3.5 w-3.5" />}
              />
              <LeadTile
                href="/leads?disposition=CALLBACK_REQUESTED"
                label="Callback"
                value={f.callbackRequested}
                color="text-blue-600"
                bg="hover:bg-blue-50"
                icon={<PhoneMissed className="h-3.5 w-3.5" />}
              />
              <LeadTile
                href="/leads?disposition=CONFIRMED"
                label="Confirmed"
                value={f.confirmed}
                color="text-indigo-600"
                bg="hover:bg-indigo-50"
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              />
              <LeadTile
                href="/leads?disposition=CONVERTED"
                label="Converted"
                value={f.converted}
                color="text-emerald-600"
                bg="hover:bg-emerald-50"
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              />
            </div>
          </div>

          {/* Follow-ups breakdown */}
          <div className="border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Follow-ups</span>
              </div>
              <Link href="/followups" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-3 divide-x">
              <FollowUpTile
                href="/followups?status=SENT"
                label="Sent"
                value={f.followUpsSent}
                color="text-blue-600"
                bg="hover:bg-blue-50"
              />
              <FollowUpTile
                href="/followups?status=REPLIED"
                label="Replied"
                value={f.followUpsReplied}
                color="text-green-600"
                bg="hover:bg-green-50"
              />
              <FollowUpTile
                href="/followups?status=PENDING"
                label="Pending"
                value={1}
                color="text-yellow-600"
                bg="hover:bg-yellow-50"
              />
            </div>
          </div>
        </div>

        {/* ── Col 3: Appointments ───────────────────────────────────── */}
        <div className="border rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Appointments</span>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {MOCK_APPOINTMENTS.length} upcoming
            </span>
          </div>

          <div className="flex-1 divide-y">
            {MOCK_APPOINTMENTS.map((apt) => {
              const d = new Date(apt.startTime);
              const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              return (
                <div key={apt.id} className="px-5 py-4">
                  <p className="text-sm font-medium leading-snug">{apt.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{apt.attendeeName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">
                      {dateStr} · {timeStr}
                    </span>
                    {apt.meetingLink && (
                      <a
                        href={apt.meetingLink}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Video className="h-3 w-3" /> Join
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reports link */}
          <Link
            href="/reports"
            className="flex items-center justify-center gap-2 px-5 py-3 border-t text-xs text-muted-foreground hover:bg-accent/30 transition-colors"
          >
            View daily reports <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FunnelStep({
  href, label, value, sub, color, icon,
}: {
  href: string; label: string; value: number; sub: string; color: string; icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex-1 rounded-lg px-4 py-3 transition-colors cursor-pointer ${color}`}
    >
      <div className="flex items-center gap-1.5 mb-1 opacity-80">{icon}<span className="text-xs font-medium">{label}</span></div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs opacity-60 mt-0.5">{sub}</div>
    </Link>
  );
}

function LeadTile({
  href, label, value, color, bg, icon,
}: {
  href: string; label: string; value: number; color: string; bg: string; icon: React.ReactNode;
}) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-4 transition-colors ${bg} cursor-pointer`}>
      <div className={`${color} opacity-70`}>{icon}</div>
      <div>
        <div className={`text-xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Link>
  );
}

function FollowUpTile({
  href, label, value, color, bg,
}: {
  href: string; label: string; value: number; color: string; bg: string;
}) {
  return (
    <Link href={href} className={`flex flex-col items-center py-4 transition-colors ${bg} cursor-pointer`}>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    CONFIGURED: "bg-blue-100 text-blue-700",
    RUNNING: "bg-green-100 text-green-700",
    PAUSED: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-purple-100 text-purple-700",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${colors[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
