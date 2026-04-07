"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Phone, ArrowRight, Mail, MessageSquare, Clock, X, PhoneCall, RefreshCw, Eye,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OutboundCampaign = {
  id: string;
  name: string;
  status: string;
  objective: string | null;
  createdAt: Date;
  totalContacts: number;
  callCount: number;
  answeredCount: number;
};

const OUTBOUND_STATUS_COLORS: Record<string, string> = {
  DRAFT:      "bg-gray-100 text-gray-600",
  CONFIGURED: "bg-blue-100 text-blue-700",
  RUNNING:    "bg-green-100 text-green-700",
  PAUSED:     "bg-yellow-100 text-yellow-700",
  COMPLETED:  "bg-purple-100 text-purple-700",
  CANCELLED:  "bg-red-100 text-red-600",
};

// ─── RFM Audience Campaigns (mock) ────────────────────────────────────────────

const RFM_SEGMENTS = [
  { value: "CHAMPIONS",  label: "Champions 🏆" },
  { value: "LOYAL",      label: "Loyal 💛" },
  { value: "POTENTIAL",  label: "Potential 🌱" },
  { value: "AT_RISK",    label: "At Risk ⚠️" },
  { value: "CANT_LOSE",  label: "Can't Lose 🚨" },
  { value: "LOST",       label: "Lost 💤" },
];

const MOCK_AUDIENCE_CAMPAIGNS = [
  {
    id: "ac-1",
    name: "Q1 Win-Back — At Risk",
    targetSegments: ["AT_RISK"],
    channel: "EMAIL",
    status: "COMPLETED",
    sentCount: 287,
    openedCount: 81,
    clickedCount: 34,
    repliedCount: 12,
    createdAt: "2026-03-15T10:00:00Z",
  },
  {
    id: "ac-2",
    name: "Champions VIP Invite",
    targetSegments: ["CHAMPIONS", "LOYAL"],
    channel: "EMAIL",
    status: "COMPLETED",
    sentCount: 327,
    openedCount: 245,
    clickedCount: 98,
    repliedCount: 41,
    createdAt: "2026-03-28T09:00:00Z",
  },
  {
    id: "ac-3",
    name: "Can't Lose — Emergency SMS",
    targetSegments: ["CANT_LOSE"],
    channel: "SMS",
    status: "COMPLETED",
    sentCount: 58,
    openedCount: 0,
    clickedCount: 21,
    repliedCount: 9,
    createdAt: "2026-03-30T14:00:00Z",
  },
];

const AUD_STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-gray-100 text-gray-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  RUNNING:   "bg-green-100 text-green-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  PAUSED:    "bg-yellow-100 text-yellow-700",
};

// ─── Call Records (mock) ──────────────────────────────────────────────────────

type CallRecord = {
  id: string;
  fromNumber: string;
  status: "COMPLETED" | "RUNNING" | "FAILED" | "PAUSED" | "DRAFT";
  recipients: number;
  failed: number;
  sent: number;
  pickedUp: number;
  completed: number;
  lastSentBy: string;
  lastSentAt: string;
  campaignName: string;
};

const CALL_STATUS_STYLES: Record<CallRecord["status"], string> = {
  COMPLETED: "bg-green-100 text-green-700",
  RUNNING:   "bg-blue-100 text-blue-700",
  FAILED:    "bg-red-100 text-red-600",
  PAUSED:    "bg-yellow-100 text-yellow-700",
  DRAFT:     "bg-gray-100 text-gray-600",
};

const MOCK_CALL_RECORDS: CallRecord[] = [
  {
    id: "cr-1",
    fromNumber: "+1 (512) 555-0101",
    status: "COMPLETED",
    recipients: 120,
    failed: 4,
    sent: 116,
    pickedUp: 89,
    completed: 74,
    lastSentBy: "Alice Chen",
    lastSentAt: "2026-03-28T14:32:00Z",
    campaignName: "Austin Dental Q1",
  },
  {
    id: "cr-2",
    fromNumber: "+1 (512) 555-0102",
    status: "RUNNING",
    recipients: 85,
    failed: 1,
    sent: 63,
    pickedUp: 41,
    completed: 30,
    lastSentBy: "Bob Martinez",
    lastSentAt: "2026-04-01T09:15:00Z",
    campaignName: "Tech Startups April",
  },
  {
    id: "cr-3",
    fromNumber: "+1 (415) 555-0203",
    status: "FAILED",
    recipients: 50,
    failed: 50,
    sent: 0,
    pickedUp: 0,
    completed: 0,
    lastSentBy: "Carol Kim",
    lastSentAt: "2026-03-30T11:00:00Z",
    campaignName: "SF Realtors Spring",
  },
  {
    id: "cr-4",
    fromNumber: "+1 (512) 555-0101",
    status: "COMPLETED",
    recipients: 200,
    failed: 12,
    sent: 188,
    pickedUp: 145,
    completed: 121,
    lastSentBy: "Alice Chen",
    lastSentAt: "2026-03-15T16:45:00Z",
    campaignName: "Gym Memberships March",
  },
  {
    id: "cr-5",
    fromNumber: "+1 (737) 555-0305",
    status: "PAUSED",
    recipients: 60,
    failed: 3,
    sent: 28,
    pickedUp: 19,
    completed: 15,
    lastSentBy: "David Lee",
    lastSentAt: "2026-04-01T13:20:00Z",
    campaignName: "Insurance Renewal",
  },
  {
    id: "cr-6",
    fromNumber: "+1 (737) 555-0306",
    status: "DRAFT",
    recipients: 95,
    failed: 0,
    sent: 0,
    pickedUp: 0,
    completed: 0,
    lastSentBy: "Eva Nguyen",
    lastSentAt: "2026-04-02T08:00:00Z",
    campaignName: "Roofing Contractors Q2",
  },
  {
    id: "cr-7",
    fromNumber: "+1 (512) 555-0102",
    status: "COMPLETED",
    recipients: 175,
    failed: 8,
    sent: 167,
    pickedUp: 110,
    completed: 98,
    lastSentBy: "Bob Martinez",
    lastSentAt: "2026-03-22T10:30:00Z",
    campaignName: "Landscaping Services",
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

// ─── Type-select modal ────────────────────────────────────────────────────────

const CAMPAIGN_TYPES = [
  {
    type: "sales" as const,
    title: "Sales Outreach",
    subtitle: "AI-powered outbound calling",
    description: "Reach new or existing leads via AI phone calls.",
    icon: <Phone className="w-7 h-7" />,
    bullets: ["Search businesses via Google Maps", "Upload CSV / Excel contacts", "Set outbound number & objective", "Schedule or launch immediately"],
    accent: "blue",
  },
  {
    type: "marketing" as const,
    title: "Marketing Touch",
    subtitle: "Email & SMS campaigns",
    description: "Target RFM-segmented customers with personalised messages.",
    icon: <Mail className="w-7 h-7" />,
    bullets: ["Filter audience by RFM segment", "Upload CSV / Excel contacts", "AI-generated Email or SMS copy", "Schedule or send immediately"],
    accent: "violet",
  },
];

function TypeSelectModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  function choose(type: "sales" | "marketing") {
    onClose();
    router.push(`/campaigns/new?type=${type}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative z-10 bg-background rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-semibold mb-1">What&apos;s your campaign goal?</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Choose the type of outreach to get started.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CAMPAIGN_TYPES.map(({ type, title, subtitle, description, icon, bullets, accent }) => (
            <button
              key={type}
              onClick={() => choose(type)}
              className={`group text-left border-2 rounded-2xl p-5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                accent === "blue"
                  ? "border-blue-100 hover:border-blue-400 hover:bg-blue-50/40"
                  : "border-violet-100 hover:border-violet-400 hover:bg-violet-50/40"
              }`}
            >
              <div className={`inline-flex p-2.5 rounded-xl border shadow-sm mb-3 text-foreground/60 group-hover:text-primary transition-colors ${
                accent === "blue" ? "bg-blue-50/50" : "bg-violet-50/50"
              }`}>
                {icon}
              </div>

              <div className="mb-2">
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>

              <p className="text-xs text-muted-foreground mb-3">{description}</p>

              <ul className="space-y-1">
                {bullets.map((b) => (
                  <li key={b} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CampaignsTabView({ outbound }: { outbound: OutboundCampaign[] }) {
  const [tab, setTab] = useState<"outbound" | "audience" | "calls">("outbound");
  const [showTypeModal, setShowTypeModal] = useState(false);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create targeted phone / Email / SMS campaigns by RFM segment
          </p>
        </div>

        <button
          onClick={() => setShowTypeModal(true)}
          className="flex items-center gap-1.5 text-sm px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {[
          { key: "outbound", label: "Outbound Calls", icon: <Phone className="w-3.5 h-3.5" /> },
          { key: "audience", label: "Audience Campaigns", icon: <Mail className="w-3.5 h-3.5" /> },
          { key: "calls", label: "Call Records", icon: <PhoneCall className="w-3.5 h-3.5" /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* ── Outbound Calls tab ───────────────────────────────────────────────── */}
      {tab === "outbound" && (
        <>
          {outbound.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed rounded-xl">
              <Phone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-lg font-medium mb-2">No outbound campaigns yet</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Start an AI-powered outbound calling campaign.
              </p>
              <button
                onClick={() => setShowTypeModal(true)}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm"
              >
                <Plus className="w-4 h-4" /> Create Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {outbound.map((c) => (
                <div
                  key={c.id}
                  className="border rounded-xl p-5 flex items-center gap-4 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="font-medium truncate">{c.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${OUTBOUND_STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {c.status}
                      </span>
                    </div>
                    {c.objective && (
                      <p className="text-sm text-muted-foreground truncate">{c.objective}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      <span>{c.totalContacts} contacts</span>
                      <span>{c.callCount} calls made</span>
                      <span className="text-green-600 font-medium">{c.answeredCount} answered</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline shrink-0"
                  >
                    View Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Audience Campaigns tab ───────────────────────────────────────────── */}
      {tab === "audience" && (
        <>
          {MOCK_AUDIENCE_CAMPAIGNS.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed rounded-xl">
              <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-lg font-medium mb-2">No audience campaigns yet</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Target specific RFM segments with personalised Email or SMS.
              </p>
              <button
                onClick={() => setShowTypeModal(true)}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm"
              >
                <Plus className="w-4 h-4" /> Create Campaign
              </button>
            </div>
          ) : (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/20 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Campaign History</h2>
              </div>
              <div className="divide-y">
                {MOCK_AUDIENCE_CAMPAIGNS.map((c) => {
                  const openRate  = c.sentCount > 0 ? ((c.openedCount  / c.sentCount) * 100).toFixed(1) : "—";
                  const clickRate = c.sentCount > 0 ? ((c.clickedCount / c.sentCount) * 100).toFixed(1) : "—";
                  const followUpHref = `/followups?channel=${c.channel}`;
                  return (
                    <Link
                      key={c.id}
                      href={followUpHref}
                      className="block px-5 py-4 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{c.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${AUD_STATUS_COLORS[c.status] ?? ""}`}>
                              {c.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {c.targetSegments.map((seg) => (
                              <span key={seg} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                                {RFM_SEGMENTS.find((s) => s.value === seg)?.label ?? seg}
                              </span>
                            ))}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              {c.channel === "EMAIL" ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                              {c.channel}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(c.createdAt))}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-right shrink-0">
                          <div>
                            <div className="text-sm font-semibold">{c.sentCount.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">Sent</div>
                          </div>
                          {c.channel === "EMAIL" && (
                            <div>
                              <div className="text-sm font-semibold">{openRate}%</div>
                              <div className="text-xs text-muted-foreground">Open rate</div>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold">{clickRate}%</div>
                            <div className="text-xs text-muted-foreground">Click rate</div>
                          </div>
                          <div>
                            <div className="text-sm font-semibold">{c.repliedCount}</div>
                            <div className="text-xs text-muted-foreground">Replies</div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Call Records tab ──────────────────────────────────────────────────── */}
      {tab === "calls" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  {["Call from number", "Campaign", "Status", "Recipients", "Failed", "Sent", "Picked Up", "Completed", "Last sent by", "Action"].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap ${i >= 3 && i <= 7 ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {MOCK_CALL_RECORDS.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        {c.fromNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <span className="truncate block text-xs text-muted-foreground">{c.campaignName}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${CALL_STATUS_STYLES[c.status]}`}>
                        {c.status === "RUNNING" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                        {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{c.recipients}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={c.failed > 0 ? "text-red-500 font-medium" : "text-muted-foreground"}>{c.failed}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{c.sent}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{c.pickedUp}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={c.completed > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>{c.completed}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium">{c.lastSentBy}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(c.lastSentAt))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button title="View details" className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {(c.status === "FAILED" || c.status === "PAUSED") && (
                          <button title="Retry" className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t bg-muted/10 flex items-center gap-6 text-xs text-muted-foreground">
            <span>{MOCK_CALL_RECORDS.length} records</span>
            <span>Recipients: <strong className="text-foreground">{MOCK_CALL_RECORDS.reduce((s, c) => s + c.recipients, 0)}</strong></span>
            <span>Sent: <strong className="text-foreground">{MOCK_CALL_RECORDS.reduce((s, c) => s + c.sent, 0)}</strong></span>
            <span>Picked Up: <strong className="text-foreground">{MOCK_CALL_RECORDS.reduce((s, c) => s + c.pickedUp, 0)}</strong></span>
            <span>Completed: <strong className="text-green-600">{MOCK_CALL_RECORDS.reduce((s, c) => s + c.completed, 0)}</strong></span>
          </div>
        </div>
      )}

      {/* Type-select modal */}
      {showTypeModal && <TypeSelectModal onClose={() => setShowTypeModal(false)} />}
    </div>
  );
}
