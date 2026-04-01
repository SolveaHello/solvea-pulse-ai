"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";
import { campaignApi } from "@/lib/api-client";
import { Rocket, CheckCircle, Phone, MapPin } from "lucide-react";

export function ReviewStep() {
  const router = useRouter();
  const { extraction, agentConfig, script, campaignId, selectedContacts, campaignName, campaignGoal, outboundPhone, reset } = useCampaignSetupStore();
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function launchCampaign() {
    if (!campaignId) return;
    setIsLaunching(true);
    setError(null);
    try {
      await campaignApi.execute(campaignId);
      reset();
      router.push(`/campaigns/${campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
      setIsLaunching(false);
    }
  }

  function saveForLater() {
    reset();
    router.push(`/campaigns/${campaignId}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Review & Launch</h2>
        <p className="text-sm text-muted-foreground">
          Confirm your campaign details before launching.
        </p>
      </div>

      <div className="space-y-4">
        <Section title="Campaign">
          <Row label="Name" value={campaignName || extraction?.name} />
          <Row label="Objective" value={campaignGoal || extraction?.objective} />
          {extraction?.targetAudience && (
            <Row label="Target Audience" value={extraction.targetAudience} />
          )}
        </Section>

        {selectedContacts.length > 0 && (
          <Section title={`Contacts (${selectedContacts.length})`}>
            <div className="space-y-1.5">
              {selectedContacts.slice(0, 5).map((c) => (
                <div key={c.placeId} className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 truncate">{c.name}</span>
                  {c.phone && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Phone className="h-3 w-3" />{c.phone}
                    </span>
                  )}
                </div>
              ))}
              {selectedContacts.length > 5 && (
                <p className="text-xs text-muted-foreground">+{selectedContacts.length - 5} more</p>
              )}
            </div>
          </Section>
        )}

        {outboundPhone && (
          <Section title="Outbound Number">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-primary" />
              <span className="font-mono font-medium">{outboundPhone}</span>
            </div>
          </Section>
        )}

        <Section title="Checklist">
          <CheckItem done={!!(campaignName || extraction?.name)} label="Campaign name set" />
          <CheckItem done={!!(campaignGoal || extraction?.objective)} label="Outreach goal defined" />
          <CheckItem done={selectedContacts.length > 0 || !!campaignId} label="Contacts selected" />
          <CheckItem done={!!outboundPhone} label="Outbound number configured" />
        </Section>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={launchCampaign}
          disabled={isLaunching || !script}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <Rocket className="h-4 w-4" />
          {isLaunching ? "Launching..." : "Launch Campaign"}
        </button>
        <button
          onClick={saveForLater}
          className="px-4 py-2.5 border rounded-lg text-sm hover:bg-muted transition-colors"
        >
          Save for Later
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="text-xs text-muted-foreground w-32 flex-shrink-0">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>
      <CheckCircle className={`h-4 w-4 ${done ? "text-green-500" : "text-muted-foreground/40"}`} />
      {label}
    </div>
  );
}
