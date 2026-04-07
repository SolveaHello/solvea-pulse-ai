"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";
import type { CampaignType } from "@/lib/stores/campaign-setup";
import { SalesSourceStep } from "@/components/campaign/wizard/SalesSourceStep";
import { MarketingSourceStep } from "@/components/campaign/wizard/MarketingSourceStep";
import { MarketingContentStep } from "@/components/campaign/wizard/MarketingContentStep";
import { MarketingConfigStep } from "@/components/campaign/wizard/MarketingConfigStep";
import { SalesLaunchStep } from "@/components/campaign/wizard/SalesLaunchStep";
import { ReviewStep } from "@/components/campaign/ReviewStep";
import { ChatSetupInterface } from "@/components/campaign/ChatSetupInterface";

// Progress steps (type-select is now handled by the modal on /campaigns)
const SALES_STEPS = ["sales-source", "review"];
const MARKETING_STEPS = ["marketing-source", "marketing-content", "marketing-config"];

const STEP_LABELS: Record<string, string> = {
  "sales-source":      "Contacts",
  "review":            "Launch",
  "marketing-source":  "Audience",
  "marketing-content": "Content",
  "marketing-config":  "Launch",
};

function WizardProgress({ steps, currentStep }: { steps: string[]; currentStep: string }) {
  const currentIdx = steps.indexOf(currentStep);
  if (currentIdx < 0) return null;
  return (
    <div className="flex items-center gap-1.5 px-6 py-2 border-b bg-muted/20 flex-shrink-0">
      {steps.map((s, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full transition-colors ${
              active ? "bg-primary text-primary-foreground"
              : done  ? "bg-green-100 text-green-700"
              :         "text-muted-foreground/50"
            }`}>
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                active ? "border-primary-foreground" : done ? "border-green-500" : "border-current"
              }`}>
                {done ? "✓" : i + 1}
              </span>
              {STEP_LABELS[s] ?? s}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-5 ${i < currentIdx ? "bg-green-300" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function NewCampaignContent() {
  const searchParams = useSearchParams();
  const { step, campaignType, reset, setCampaignType, setStep } = useCampaignSetupStore();

  useEffect(() => {
    const typeParam = searchParams.get("type") as CampaignType | null;
    reset();
    if (typeParam === "sales") {
      setCampaignType("sales");
      setStep("sales-source");
    } else if (typeParam === "marketing") {
      setCampaignType("marketing");
      setStep("marketing-source");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressSteps =
    campaignType === "marketing" ? MARKETING_STEPS :
    campaignType === "sales"     ? SALES_STEPS     : [];

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b px-6 py-3 flex-shrink-0">
        <h1 className="text-base font-semibold">New Campaign</h1>
      </div>

      {progressSteps.length > 0 && (
        <WizardProgress steps={progressSteps} currentStep={step} />
      )}

      <div className="flex-1 overflow-hidden">
        {step === "sales-source"      && <SalesSourceStep />}
        {step === "marketing-source"  && <MarketingSourceStep />}
        {step === "marketing-content" && <MarketingContentStep />}
        {step === "marketing-config"  && <MarketingConfigStep />}

        {step === "review" && campaignType === "sales" && <SalesLaunchStep />}
        {step === "review" && campaignType !== "sales" && (
          <div className="p-6 max-w-2xl mx-auto overflow-y-auto h-full">
            <ReviewStep />
          </div>
        )}

        {/* Legacy chat flow */}
        {(step === "search-contacts" || step === "set-goal" || step === "set-outbound-number" ||
          step === "chat" || step === "confirm-extraction" || step === "agent-config" ||
          step === "contacts") && <ChatSetupInterface />}
      </div>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-sm text-muted-foreground">Loading…</div>}>
      <NewCampaignContent />
    </Suspense>
  );
}
