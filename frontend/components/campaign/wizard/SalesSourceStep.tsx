"use client";

import { useState, useRef } from "react";
import { MapPin, Upload, ArrowLeft, CheckCircle2, Users } from "lucide-react";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";
import { MapSearchCard } from "@/components/campaign/cards/MapSearchCard";
import type { MapConfirmData } from "@/components/campaign/cards/MapSearchCard";

type SourceMode = "map" | "csv";

export function SalesSourceStep() {
  const [mode, setMode] = useState<SourceMode>("map");
  const [csvContacts, setCsvContacts] = useState<{ name: string; phone: string; email?: string }[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvParsing, setCsvParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    setStep,
    setCampaignType,
    setSelectedContacts,
    setOutboundPhone,
    setCampaignGoal,
    campaignName,
    setCampaignName,
  } = useCampaignSetupStore();

  // Maps path: MapSearchCard calls onConfirm with all data → go straight to review
  function handleMapConfirm(data: MapConfirmData) {
    setSelectedContacts(data.contacts);
    setOutboundPhone(data.outboundPhone);
    setCampaignGoal(data.objective);
    setStep("review");
  }

  // CSV path
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
      const nameIdx = headers.findIndex((h) => h.includes("name"));
      const phoneIdx = headers.findIndex((h) => h.includes("phone"));
      const emailIdx = headers.findIndex((h) => h.includes("email"));

      const parsed = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
        return {
          name: nameIdx >= 0 ? cols[nameIdx] ?? "" : "",
          phone: phoneIdx >= 0 ? cols[phoneIdx] ?? "" : "",
          email: emailIdx >= 0 ? cols[emailIdx] : undefined,
        };
      }).filter((c) => c.name || c.phone);

      setCsvContacts(parsed);
      setCsvParsing(false);
    };
    reader.readAsText(file);
  }

  function handleCsvContinue() {
    // Convert CSV contacts to PlaceResult format
    const contacts = csvContacts.map((c, i) => ({
      placeId: `csv-${i}`,
      name: c.name,
      address: "",
      phone: c.phone,
    }));
    setSelectedContacts(contacts);
    setStep("review");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0">
        <button
          onClick={() => { setCampaignType(null as never); setStep("type-select"); }}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h2 className="text-sm font-semibold">Sales Outreach — Select Contacts</h2>
          <p className="text-xs text-muted-foreground">Step 1 of 2</p>
        </div>
      </div>

      {/* Campaign name */}
      <div className="px-6 py-3 border-b flex-shrink-0">
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          Campaign Name <span className="text-red-500">*</span>
        </label>
        <input
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="e.g. Austin Dental Clinics Q2"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Source toggle */}
      <div className="px-6 py-4 border-b flex-shrink-0">
        <div className="inline-flex rounded-lg border p-1 gap-1">
          <ModeButton active={mode === "map"} onClick={() => setMode("map")} icon={<MapPin className="w-3.5 h-3.5" />}>
            Google Maps Search
          </ModeButton>
          <ModeButton active={mode === "csv"} onClick={() => setMode("csv")} icon={<Upload className="w-3.5 h-3.5" />}>
            Upload CSV / Excel
          </ModeButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {mode === "map" && (
          <MapSearchCard onConfirm={handleMapConfirm} />
        )}

        {mode === "csv" && (
          <div className="max-w-xl">
            {csvContacts.length === 0 ? (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium mb-1">Drop your CSV or Excel file here</p>
                <p className="text-xs text-muted-foreground mb-4">
                  File should include Name, Phone, and optionally Email columns
                </p>
                <span className="text-xs px-4 py-1.5 border rounded-lg hover:bg-accent transition-colors">
                  Choose file
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{csvFileName}</p>
                    <p className="text-xs text-muted-foreground">{csvContacts.length} contacts parsed</p>
                  </div>
                  <button
                    onClick={() => { setCsvContacts([]); setCsvFileName(""); }}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change file
                  </button>
                </div>

                <div className="border rounded-xl overflow-hidden mb-5">
                  <div className="grid grid-cols-[1fr_140px_160px] px-4 py-2 bg-muted/30 border-b text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Name</span>
                    <span>Phone</span>
                    <span>Email</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y">
                    {csvContacts.slice(0, 50).map((c, i) => (
                      <div key={i} className="grid grid-cols-[1fr_140px_160px] px-4 py-2.5 text-xs">
                        <span className="font-medium truncate">{c.name || "—"}</span>
                        <span className="text-muted-foreground">{c.phone || "—"}</span>
                        <span className="text-muted-foreground truncate">{c.email || "—"}</span>
                      </div>
                    ))}
                    {csvContacts.length > 50 && (
                      <div className="px-4 py-2 text-xs text-muted-foreground">
                        +{csvContacts.length - 50} more contacts
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Set up your outbound phone and objective in the next step.</p>
                  <button
                    onClick={handleCsvContinue}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Continue with {csvContacts.length} contacts →
                  </button>
                </div>
              </div>
            )}

            {csvParsing && (
              <div className="text-center py-8 text-sm text-muted-foreground">Parsing file…</div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
