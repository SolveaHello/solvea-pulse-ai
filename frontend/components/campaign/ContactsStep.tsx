"use client";

import { useState } from "react";
import { MapPin, Upload, Pencil, CheckCircle, ArrowRight } from "lucide-react";
import { GoogleMapsSearch } from "@/components/contacts/GoogleMapsSearch";
import { CSVUploader } from "@/components/contacts/CSVUploader";
import { ManualEntry } from "@/components/contacts/ManualEntry";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";

type Tab = "maps" | "upload" | "manual";

export function ContactsStep() {
  const [activeTab, setActiveTab] = useState<Tab>("maps");
  const [totalImported, setTotalImported] = useState(0);
  const { campaignId, setStep } = useCampaignSetupStore();

  function handleImport(count: number) {
    setTotalImported((prev) => prev + count);
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "maps", label: "Google Maps", icon: <MapPin className="h-4 w-4" /> },
    { key: "upload", label: "Upload File", icon: <Upload className="h-4 w-4" /> },
    { key: "manual", label: "Manual Entry", icon: <Pencil className="h-4 w-4" /> },
  ];

  if (!campaignId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Add Contacts</h2>
        <p className="text-sm text-muted-foreground">
          Import phone numbers to call via Google Maps search, file upload, or manual entry.
        </p>
      </div>

      {totalImported > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <CheckCircle className="h-4 w-4" />
          {totalImported} contacts imported so far
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "maps" && (
          <GoogleMapsSearch campaignId={campaignId} onImport={handleImport} />
        )}
        {activeTab === "upload" && (
          <CSVUploader campaignId={campaignId} onImport={handleImport} />
        )}
        {activeTab === "manual" && (
          <ManualEntry campaignId={campaignId} onImport={handleImport} />
        )}
      </div>

      <button
        onClick={() => setStep("review")}
        disabled={totalImported === 0}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        Continue to Review <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
