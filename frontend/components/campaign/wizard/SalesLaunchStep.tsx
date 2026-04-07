"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Rocket, CheckCircle, Phone, MapPin, Clock, CalendarDays,
} from "lucide-react";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";
import { campaignApi, contactApi } from "@/lib/api-client";

export function SalesLaunchStep() {
  const router = useRouter();
  const {
    campaignName,
    campaignGoal,
    outboundPhone,
    selectedContacts,
    setStep,
    reset,
  } = useCampaignSetupStore();

  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLaunch = !!campaignName.trim() && selectedContacts.length > 0;

  async function launch() {
    if (!canLaunch) return;
    setLaunching(true);
    setError(null);

    try {
      // 1. Create campaign record
      const campaign = await campaignApi.create({
        name: campaignName,
        objective: campaignGoal,
        status: "CONFIGURED",
        talkingPoints: [],
        agentConfig: {
          voiceProvider: "elevenlabs",
          voiceId: "21m00Tcm4TlvDq8ikWAM",
          voiceName: "Rachel",
          tone: "professional",
          speed: 1.0,
          firstMessage: "Hi, this is an AI assistant calling. Is this a good time to talk?",
        },
        script: "",
      } as never);

      // 2. Add contacts to campaign
      const contactPayload = selectedContacts
        .filter((c) => c.phone)
        .map((c) => ({
          phone: c.phone!,
          name: c.name,
          businessName: c.name,
          email: (c as { email?: string }).email,
        }));

      if (contactPayload.length > 0) {
        await contactApi.addManual(campaign.id, contactPayload);
      }

      setLaunched(true);
      setTimeout(() => {
        reset();
        router.refresh();          // ensure server component re-fetches fresh Prisma data
        router.push("/campaigns"); // lands on Outbound Calls (default tab)
      }, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed. Please try again.");
      setLaunching(false);
    }
  }

  if (launched) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-1">Campaign created!</h2>
          <p className="text-sm text-muted-foreground">
            &ldquo;{campaignName}&rdquo; is ready. Taking you to Outbound Calls…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0">
        <button
          onClick={() => setStep("sales-source")}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h2 className="text-sm font-semibold">Sales Outreach — Review & Launch</h2>
          <p className="text-xs text-muted-foreground">Step 2 of 2</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 max-w-2xl mx-auto w-full space-y-4">
        {/* Campaign summary */}
        <div className="border rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campaign</h3>
          <SummaryRow label="Name" value={campaignName || <span className="text-red-500 text-xs">Required — go back and enter a name</span>} />
          {campaignGoal && <SummaryRow label="Objective" value={campaignGoal} />}
          {outboundPhone && (
            <SummaryRow
              label="Outbound #"
              value={
                <span className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5" /> {outboundPhone}
                </span>
              }
            />
          )}
        </div>

        {/* Contacts */}
        <div className="border rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Contacts ({selectedContacts.length})
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {selectedContacts.slice(0, 8).map((c) => (
              <div key={c.placeId} className="flex items-center gap-2 text-sm">
                <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 truncate">{c.name}</span>
                {c.phone && (
                  <span className="text-xs text-green-600 font-mono flex-shrink-0">{c.phone}</span>
                )}
              </div>
            ))}
            {selectedContacts.length > 8 && (
              <p className="text-xs text-muted-foreground pl-5">+{selectedContacts.length - 8} more</p>
            )}
          </div>
        </div>

        {/* Checklist */}
        <div className="border rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Checklist</h3>
          <CheckItem done={!!campaignName.trim()} label="Campaign name" />
          <CheckItem done={selectedContacts.length > 0} label={`${selectedContacts.length} contacts selected`} />
          <CheckItem done={!!outboundPhone} label="Outbound number set" />
          <CheckItem done={!!campaignGoal} label="Objective defined" />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t flex-shrink-0 flex gap-3">
        <button
          onClick={launch}
          disabled={!canLaunch || launching}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40"
        >
          <Rocket className="w-4 h-4" />
          {launching ? "Creating…" : "Launch Campaign"}
        </button>
        <button
          onClick={() => { reset(); router.push("/campaigns"); }}
          className="px-4 py-2.5 border rounded-xl text-sm hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <dt className="text-xs text-muted-foreground w-24 flex-shrink-0 pt-0.5">{label}</dt>
      <dd className="text-sm font-medium flex-1">{value}</dd>
    </div>
  );
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${done ? "" : "text-muted-foreground"}`}>
      <CheckCircle className={`h-4 w-4 flex-shrink-0 ${done ? "text-green-500" : "text-muted-foreground/30"}`} />
      {label}
    </div>
  );
}
