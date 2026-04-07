"use client";

import { Phone, Mail, ArrowRight } from "lucide-react";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";
import type { CampaignType } from "@/lib/stores/campaign-setup";

const CAMPAIGN_TYPES: {
  type: CampaignType;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  bullets: string[];
  accentClass: string;
}[] = [
  {
    type: "sales",
    title: "Sales Outreach",
    subtitle: "外呼获客",
    description: "AI-powered outbound calling to reach new or existing leads.",
    icon: <Phone className="w-8 h-8" />,
    bullets: [
      "Search businesses via Google Maps",
      "Upload CSV / Excel contact list",
      "Set outbound number & call objective",
      "Schedule or launch immediately",
    ],
    accentClass: "border-blue-200 hover:border-blue-400 hover:bg-blue-50/40",
  },
  {
    type: "marketing",
    title: "Marketing Touch",
    subtitle: "营销触达",
    description: "Targeted Email or SMS campaigns to RFM-segmented customers.",
    icon: <Mail className="w-8 h-8" />,
    bullets: [
      "Filter audience by RFM segment",
      "Upload CSV / Excel contact list",
      "AI-generated Email or SMS copy",
      "Schedule or send immediately",
    ],
    accentClass: "border-violet-200 hover:border-violet-400 hover:bg-violet-50/40",
  },
];

export function TypeSelectStep() {
  const { setCampaignType, setStep } = useCampaignSetupStore();

  function choose(type: CampaignType) {
    setCampaignType(type);
    setStep(type === "sales" ? "sales-source" : "marketing-source");
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      <h2 className="text-xl font-semibold mb-2 text-center">What's your campaign goal?</h2>
      <p className="text-sm text-muted-foreground mb-10 text-center max-w-sm">
        Choose the type of outreach — you'll configure contacts, content, and timing in the next steps.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
        {CAMPAIGN_TYPES.map(({ type, title, subtitle, description, icon, bullets, accentClass }) => (
          <button
            key={type}
            onClick={() => choose(type)}
            className={`group text-left border-2 rounded-2xl p-6 transition-all duration-150 ${accentClass} focus:outline-none focus:ring-2 focus:ring-primary/40`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-background border shadow-sm text-foreground/70 group-hover:text-primary transition-colors">
                {icon}
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors mt-1" />
            </div>

            <div className="mb-3">
              <h3 className="text-base font-semibold leading-tight">{title}</h3>
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            </div>

            <p className="text-sm text-muted-foreground mb-4">{description}</p>

            <ul className="space-y-1.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}
