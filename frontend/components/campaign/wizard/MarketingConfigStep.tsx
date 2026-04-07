"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Rocket, Clock, CalendarDays, Mail, MessageSquare, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";

const RFM_LABELS: Record<string, string> = {
  CHAMPIONS: "Champions 🏆",
  LOYAL: "Loyal 💛",
  POTENTIAL: "Potential 🌱",
  AT_RISK: "At Risk ⚠️",
  CANT_LOSE: "Can't Lose 🚨",
  LOST: "Lost 💤",
};

const RFM_COUNTS: Record<string, number> = {
  CHAMPIONS: 142, LOYAL: 318, POTENTIAL: 487,
  AT_RISK: 203, CANT_LOSE: 76, LOST: 391,
};

export function MarketingConfigStep() {
  const router = useRouter();
  const {
    marketingName,
    setMarketingName,
    marketingObjective,
    marketingChannel,
    targetSegments,
    aiContent,
    emailSubject,
    marketingScheduleAt,
    setMarketingScheduleAt,
    setStep,
    reset,
  } = useCampaignSetupStore();

  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setScheduleDate(d.toISOString().slice(0, 10));
  }, []);

  const totalContacts = targetSegments.reduce((sum, s) => sum + (RFM_COUNTS[s] ?? 0), 0);

  async function launch() {
    setSending(true);

    const scheduleAt =
      scheduleMode === "schedule" && scheduleDate
        ? new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
        : null;
    setMarketingScheduleAt(scheduleAt);

    // Simulate API call
    await new Promise((r) => setTimeout(r, 2000));
    setSending(false);
    setSent(true);

    // After showing success, redirect to campaigns
    setTimeout(() => {
      reset();
      router.push("/campaigns");
    }, 1800);
  }

  const canLaunch = marketingName.trim().length > 0 && aiContent.trim().length > 0;

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-1">Campaign launched!</h2>
          <p className="text-sm text-muted-foreground">
            {scheduleMode === "schedule"
              ? `Scheduled for ${new Date(`${scheduleDate}T${scheduleTime}:00`).toLocaleString()}`
              : "Your messages are being sent now."}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Redirecting to campaigns…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0">
        <button
          onClick={() => setStep("marketing-content")}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h2 className="text-sm font-semibold">Marketing Touch — Schedule & Launch</h2>
          <p className="text-xs text-muted-foreground">Step 3 of 3</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 max-w-2xl mx-auto w-full space-y-5">
        {/* Summary card */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-2.5 text-sm">
          <SummaryRow
            label="Channel"
            value={
              <span className="flex items-center gap-1.5">
                {marketingChannel === "EMAIL"
                  ? <><Mail className="w-3.5 h-3.5" /> Email</>
                  : <><MessageSquare className="w-3.5 h-3.5" /> SMS</>
                }
              </span>
            }
          />
          {targetSegments.length > 0 && (
            <SummaryRow
              label="Audience"
              value={`${totalContacts.toLocaleString()} contacts — ${targetSegments.map((s) => RFM_LABELS[s] ?? s).join(", ")}`}
            />
          )}
          {marketingObjective && (
            <SummaryRow label="Objective" value={marketingObjective} />
          )}
          {marketingChannel === "EMAIL" && emailSubject && (
            <SummaryRow label="Subject" value={emailSubject} />
          )}
        </div>

        {/* Campaign name */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
            Campaign Name
          </label>
          <input
            value={marketingName}
            onChange={(e) => setMarketingName(e.target.value)}
            placeholder="e.g. Q2 Win-Back At Risk"
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Schedule */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Send Time
          </p>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="mkt-schedule"
                checked={scheduleMode === "now"}
                onChange={() => setScheduleMode("now")}
                className="accent-primary"
              />
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              Send now
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="mkt-schedule"
                checked={scheduleMode === "schedule"}
                onChange={() => setScheduleMode("schedule")}
                className="accent-primary"
              />
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
              Schedule
            </label>
          </div>
          {scheduleMode === "schedule" && (
            <div className="flex gap-2">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-28 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t flex-shrink-0 flex gap-3">
        <button
          onClick={launch}
          disabled={!canLaunch || sending}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40"
        >
          <Rocket className="w-4 h-4" />
          {sending ? "Launching…" : scheduleMode === "schedule" ? "Schedule Campaign" : "Send Now"}
        </button>
        <button
          onClick={() => { reset(); router.push("/campaigns"); }}
          className="px-4 py-2.5 border rounded-xl text-sm hover:bg-muted transition-colors"
        >
          Save as Draft
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="text-xs text-muted-foreground w-20 flex-shrink-0 pt-0.5">{label}</dt>
      <dd className="text-sm font-medium flex-1">{value}</dd>
    </div>
  );
}
