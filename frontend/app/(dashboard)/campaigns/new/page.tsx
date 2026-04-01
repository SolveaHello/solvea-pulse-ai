"use client";

import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";
import { ChatSetupInterface } from "@/components/campaign/ChatSetupInterface";
import { ReviewStep } from "@/components/campaign/ReviewStep";

export default function NewCampaignPage() {
  const { step } = useCampaignSetupStore();

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b px-6 py-3 flex-shrink-0">
        <h1 className="text-base font-semibold">New Campaign</h1>
      </div>

      <div className="flex-1 overflow-hidden">
        {(step === "search-contacts" ||
          step === "set-goal" ||
          step === "set-outbound-number" ||
          step === "chat" ||
          step === "confirm-extraction" ||
          step === "agent-config" ||
          step === "contacts") && <ChatSetupInterface />}

        {step === "review" && (
          <div className="p-6 max-w-2xl mx-auto overflow-y-auto h-full">
            <ReviewStep />
          </div>
        )}
      </div>
    </div>
  );
}
