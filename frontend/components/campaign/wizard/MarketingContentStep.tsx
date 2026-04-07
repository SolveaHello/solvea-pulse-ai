"use client";

import { useState } from "react";
import { Mail, MessageSquare, ArrowLeft, ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";

const RFM_LABELS: Record<string, string> = {
  CHAMPIONS: "Champions 🏆",
  LOYAL: "Loyal 💛",
  POTENTIAL: "Potential 🌱",
  AT_RISK: "At Risk ⚠️",
  CANT_LOSE: "Can't Lose 🚨",
  LOST: "Lost 💤",
};

export function MarketingContentStep() {
  const {
    marketingChannel,
    setMarketingChannel,
    targetSegments,
    marketingObjective,
    setMarketingObjective,
    aiContent,
    setAiContent,
    emailSubject,
    setEmailSubject,
    setStep,
  } = useCampaignSetupStore();

  const [generating, setGenerating] = useState(false);

  async function generateContent() {
    if (!marketingObjective.trim()) return;
    setGenerating(true);

    await new Promise((r) => setTimeout(r, 1800));

    const isWinBack = targetSegments.some((s) => ["AT_RISK", "CANT_LOSE", "LOST"].includes(s));
    const isVip = targetSegments.some((s) => ["CHAMPIONS", "LOYAL"].includes(s));

    if (marketingChannel === "EMAIL") {
      const subject = isWinBack
        ? "We miss you — here's something special just for you 🎁"
        : isVip
        ? "Exclusive access just for our VIP customers ✨"
        : "An update we think you'll love";

      const body = isWinBack
        ? `Hi {name},\n\nWe noticed it's been a while — and we genuinely miss you.\n\n${marketingObjective}\n\nAs a valued customer, we'd love to welcome you back with an exclusive offer:\n\n→ Use code COMEBACK20 for 20% off your next order\n\nThis offer is valid for the next 7 days. We hope to see you soon!\n\nWarm regards,\nThe Team`
        : isVip
        ? `Hi {name},\n\nAs one of our most valued customers, you deserve early access.\n\n${marketingObjective}\n\nClick below to see what's new — exclusively for you:\n\n[View Exclusive Offers →]\n\nThank you for your continued trust.\n\nBest,\nThe Team`
        : `Hi {name},\n\n${marketingObjective}\n\nWe think you'll love what we have in store. Click below to learn more:\n\n[Explore Now →]\n\nBest regards,\nThe Team`;

      if (!emailSubject) setEmailSubject(subject);
      setAiContent(body);
    } else {
      const sms = isWinBack
        ? `Hi {name}! We miss you 💙 ${marketingObjective} — exclusive 20% off just for you: [link] Reply STOP to opt out.`
        : isVip
        ? `Hi {name}! As a VIP customer: ${marketingObjective} Check it out → [link] Reply STOP to opt out.`
        : `Hi {name}! ${marketingObjective} See details → [link] Reply STOP to opt out.`;
      setAiContent(sms);
    }

    setGenerating(false);
  }

  const canContinue = aiContent.trim().length > 0 && marketingObjective.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0">
        <button
          onClick={() => setStep("marketing-source")}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h2 className="text-sm font-semibold">Marketing Touch — Channel & Content</h2>
          <p className="text-xs text-muted-foreground">Step 2 of 3</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 max-w-2xl mx-auto w-full">
        {/* Channel selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
            Channel
          </label>
          <div className="flex gap-3">
            <ChannelButton
              active={marketingChannel === "EMAIL"}
              onClick={() => setMarketingChannel("EMAIL")}
              icon={<Mail className="w-4 h-4" />}
              label="Email"
              description="Subject + body, supports HTML"
            />
            <ChannelButton
              active={marketingChannel === "SMS"}
              onClick={() => setMarketingChannel("SMS")}
              icon={<MessageSquare className="w-4 h-4" />}
              label="SMS"
              description="Plain text, max 160 chars"
            />
          </div>
        </div>

        {/* Audience summary */}
        {targetSegments.length > 0 && (
          <div className="bg-muted/30 rounded-xl px-4 py-3 text-xs text-muted-foreground">
            Targeting:{" "}
            {targetSegments.map((s) => RFM_LABELS[s] ?? s).join(", ")}
          </div>
        )}

        {/* Objective input */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
            Campaign Objective
          </label>
          <textarea
            value={marketingObjective}
            onChange={(e) => setMarketingObjective(e.target.value)}
            placeholder="e.g. Win back at-risk customers with a 20% discount to re-engage them before Q2"
            rows={2}
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {/* Email subject (email only) */}
        {marketingChannel === "EMAIL" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
              Subject Line
            </label>
            <input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Email subject…"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        {/* Content area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {marketingChannel === "SMS" ? "SMS Content (≤160 chars)" : "Email Body"}
            </label>
            <button
              onClick={generateContent}
              disabled={generating || !marketingObjective.trim()}
              className="flex items-center gap-1.5 text-xs px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-40 transition-colors"
            >
              {generating ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {generating ? "Generating…" : "Generate with AI"}
            </button>
          </div>
          <textarea
            value={aiContent}
            onChange={(e) => setAiContent(e.target.value)}
            rows={marketingChannel === "SMS" ? 4 : 10}
            placeholder={
              marketingChannel === "SMS"
                ? "Hi {name}, …"
                : "Hi {name},\n\n…"
            }
            maxLength={marketingChannel === "SMS" ? 160 : undefined}
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono resize-none"
          />
          {marketingChannel === "SMS" && (
            <p className="text-xs text-muted-foreground mt-1 text-right">{aiContent.length}/160</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t flex-shrink-0">
        <button
          onClick={() => setStep("marketing-config")}
          disabled={!canContinue}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          Next: Schedule & Launch <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ChannelButton({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-left p-4 rounded-xl border-2 transition-all ${
        active ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
      }`}
    >
      <div className={`mb-2 ${active ? "text-primary" : "text-muted-foreground"}`}>{icon}</div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
