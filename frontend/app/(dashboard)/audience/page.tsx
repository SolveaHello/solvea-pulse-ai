"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload, RefreshCw, Users, TrendingDown, AlertTriangle, Crown, Leaf, Star } from "lucide-react";

// Mock RFM segment data for UI development
const MOCK_SEGMENTS = [
  {
    segment: "CHAMPIONS",
    label: "Champions",
    emoji: "🏆",
    color: "emerald",
    count: 124,
    description: "High R, F & M — recent, frequent, big spenders",
    strategy: "Referral programs, exclusive rewards",
    bgClass: "bg-emerald-50 border-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-800",
  },
  {
    segment: "LOYAL",
    label: "Loyal",
    emoji: "💛",
    color: "yellow",
    count: 203,
    description: "High frequency, consistent spend",
    strategy: "New product previews, loyalty points",
    bgClass: "bg-yellow-50 border-yellow-200",
    badgeClass: "bg-yellow-100 text-yellow-800",
  },
  {
    segment: "POTENTIAL",
    label: "Potential",
    emoji: "🌱",
    color: "blue",
    count: 341,
    description: "Recent buyers, low frequency — guide 2nd purchase",
    strategy: "Onboarding series, related product recs",
    bgClass: "bg-blue-50 border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  {
    segment: "AT_RISK",
    label: "At Risk",
    emoji: "⚠️",
    color: "orange",
    count: 287,
    description: "Previously active, recently gone quiet",
    strategy: "Win-back email, limited-time offer",
    bgClass: "bg-orange-50 border-orange-200",
    badgeClass: "bg-orange-100 text-orange-800",
  },
  {
    segment: "CANT_LOSE",
    label: "Can't Lose",
    emoji: "🚨",
    color: "red",
    count: 58,
    description: "High-value but long-inactive — urgent intervention",
    strategy: "Personal outreach, VIP recovery offer",
    bgClass: "bg-red-50 border-red-200",
    badgeClass: "bg-red-100 text-red-800",
  },
  {
    segment: "LOST",
    label: "Lost",
    emoji: "💤",
    color: "gray",
    count: 512,
    description: "Low R, F & M — minimal engagement",
    strategy: "Quarterly re-engagement only",
    bgClass: "bg-gray-50 border-gray-200",
    badgeClass: "bg-gray-100 text-gray-700",
  },
];

const TOTAL_USERS = MOCK_SEGMENTS.reduce((s, seg) => s + seg.count, 0);

export default function AudiencePage() {
  const [recalculating, setRecalculating] = useState(false);
  const [lastCalc, setLastCalc] = useState<string | null>(null);

  const handleRecalculate = async () => {
    setRecalculating(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500));
    setLastCalc(new Date().toLocaleTimeString());
    setRecalculating(false);
  };

  const atRisk = MOCK_SEGMENTS.find((s) => s.segment === "AT_RISK")?.count ?? 0;
  const cantLose = MOCK_SEGMENTS.find((s) => s.segment === "CANT_LOSE")?.count ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Operations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            RFM-based segmentation for your {TOTAL_USERS.toLocaleString()} customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-md hover:bg-accent cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Import CSV
            <input type="file" accept=".csv" className="hidden" />
          </label>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-md hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? "animate-spin" : ""}`} />
            {recalculating ? "Recalculating…" : "Recalculate RFM"}
          </button>
          <Link
            href="/audience/campaigns"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            New Campaign
          </Link>
        </div>
      </div>

      {/* Alert banner for at-risk users */}
      {(atRisk + cantLose) > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl mb-6">
          <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
          <p className="text-sm text-orange-800">
            <strong>{atRisk + cantLose} users</strong> need immediate attention ({atRisk} at risk, {cantLose} high-value inactive).
            <Link href="/audience/campaigns" className="ml-2 underline hover:no-underline">
              Create a win-back campaign →
            </Link>
          </p>
          {lastCalc && (
            <span className="ml-auto text-xs text-orange-600">Last recalculated: {lastCalc}</span>
          )}
        </div>
      )}

      {/* Segment cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {MOCK_SEGMENTS.map((seg) => (
          <div key={seg.segment} className={`rounded-xl border p-5 ${seg.bgClass}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-2xl mr-1">{seg.emoji}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${seg.badgeClass}`}>
                  {seg.label}
                </span>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{seg.count.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  {((seg.count / TOTAL_USERS) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{seg.description}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground/70">
                Strategy: <span className="text-foreground">{seg.strategy}</span>
              </p>
              <Link
                href={`/audience/campaigns?segment=${seg.segment}`}
                className="text-xs px-2.5 py-1 border rounded-md hover:bg-white/60 transition-colors"
              >
                Target →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Segment health bar */}
      <div className="bg-card border rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3">Segment Distribution</h2>
        <div className="flex h-4 rounded-full overflow-hidden gap-px">
          {MOCK_SEGMENTS.map((seg) => {
            const pct = (seg.count / TOTAL_USERS) * 100;
            const colorMap: Record<string, string> = {
              CHAMPIONS: "bg-emerald-500",
              LOYAL: "bg-yellow-400",
              POTENTIAL: "bg-blue-400",
              AT_RISK: "bg-orange-400",
              CANT_LOSE: "bg-red-500",
              LOST: "bg-gray-300",
            };
            return (
              <div
                key={seg.segment}
                style={{ width: `${pct}%` }}
                className={`${colorMap[seg.segment] ?? "bg-gray-300"} transition-all`}
                title={`${seg.label}: ${seg.count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {MOCK_SEGMENTS.map((seg) => {
            const colorMap: Record<string, string> = {
              CHAMPIONS: "bg-emerald-500",
              LOYAL: "bg-yellow-400",
              POTENTIAL: "bg-blue-400",
              AT_RISK: "bg-orange-400",
              CANT_LOSE: "bg-red-500",
              LOST: "bg-gray-300",
            };
            return (
              <div key={seg.segment} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${colorMap[seg.segment] ?? "bg-gray-300"}`} />
                {seg.emoji} {seg.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* RFM model explainer */}
      <div className="bg-muted/30 border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-2">How RFM Scoring Works</h2>
        <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div>
            <strong className="text-foreground">R — Recency</strong>
            <p className="mt-1">Days since last purchase. Recent buyers score higher (1–5).</p>
          </div>
          <div>
            <strong className="text-foreground">F — Frequency</strong>
            <p className="mt-1">Total order count. More orders → higher score (1–5).</p>
          </div>
          <div>
            <strong className="text-foreground">M — Monetary</strong>
            <p className="mt-1">Total spend. Higher spend → higher score (1–5).</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Composite score = 0.4 × R + 0.3 × F + 0.3 × M. Recalculated daily at 00:05 UTC.
        </p>
      </div>
    </div>
  );
}
