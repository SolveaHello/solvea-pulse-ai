"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, Target, MapPin, Phone } from "lucide-react";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";

export function SetGoalStep() {
  const { selectedContacts, campaignName, campaignGoal, setCampaignName, setCampaignGoal, setStep } =
    useCampaignSetupStore();

  const [name, setName] = useState(campaignName);
  const [goal, setGoal] = useState(campaignGoal);

  function handleContinue() {
    setCampaignName(name.trim());
    setCampaignGoal(goal.trim());
    setStep("set-outbound-number");
  }

  const withPhone = selectedContacts.filter((c) => c.phone).length;

  return (
    <div className="max-w-xl mx-auto p-8 h-full overflow-y-auto space-y-8">
      {/* Summary of selected contacts */}
      <div className="border rounded-xl p-4 bg-muted/30 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium mb-2">
          <Target className="h-4 w-4 text-primary" />
          <span>{selectedContacts.length} contacts selected · {withPhone} with phone</span>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {selectedContacts.slice(0, 6).map((c) => (
            <div key={c.placeId} className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{c.name}</span>
              {c.phone && (
                <span className="flex items-center gap-0.5 text-green-600 ml-auto flex-shrink-0">
                  <Phone className="h-3 w-3" />{c.phone}
                </span>
              )}
            </div>
          ))}
          {selectedContacts.length > 6 && (
            <p className="text-xs text-muted-foreground">
              +{selectedContacts.length - 6} more…
            </p>
          )}
        </div>
      </div>

      {/* Campaign form */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Campaign Details</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Give your campaign a name and describe the outreach goal.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Campaign Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Austin Dentists Q2 Outreach"
            className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Outreach Objective</label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. We're reaching out to introduce our dental supply service and schedule a 10-minute call with the practice manager to discuss pricing."
            rows={4}
            className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Describe what the AI agent should say and what action you want the contact to take.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep("search-contacts")}
          className="flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!name.trim() || !goal.trim()}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
