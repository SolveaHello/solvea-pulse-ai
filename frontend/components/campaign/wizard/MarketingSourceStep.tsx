"use client";

import { useState, useRef } from "react";
import { Upload, Tag, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";

const RFM_SEGMENTS = [
  { value: "CHAMPIONS",  label: "Champions 🏆",  description: "High value, recent, frequent", count: 142 },
  { value: "LOYAL",      label: "Loyal 💛",       description: "Consistent buyers", count: 318 },
  { value: "POTENTIAL",  label: "Potential 🌱",   description: "New or occasional buyers", count: 487 },
  { value: "AT_RISK",    label: "At Risk ⚠️",      description: "Previously active, now quiet", count: 203 },
  { value: "CANT_LOSE",  label: "Can't Lose 🚨",  description: "High-value, long-inactive", count: 76 },
  { value: "LOST",       label: "Lost 💤",         description: "Minimal engagement", count: 391 },
];

type SourceMode = "rfm" | "csv";

export function MarketingSourceStep() {
  const [mode, setMode] = useState<SourceMode>("rfm");
  const [csvContacts, setCsvContacts] = useState<{ name: string; email?: string; phone?: string }[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    setStep,
    targetSegments,
    setTargetSegments,
    setMarketingContactSource,
  } = useCampaignSetupStore();

  function toggleSegment(seg: string) {
    setTargetSegments(
      targetSegments.includes(seg)
        ? targetSegments.filter((s) => s !== seg)
        : [...targetSegments, seg]
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
      const nameIdx = headers.findIndex((h) => h.includes("name"));
      const emailIdx = headers.findIndex((h) => h.includes("email"));
      const phoneIdx = headers.findIndex((h) => h.includes("phone"));

      const parsed = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
        return {
          name: nameIdx >= 0 ? cols[nameIdx] ?? "" : "",
          email: emailIdx >= 0 ? cols[emailIdx] : undefined,
          phone: phoneIdx >= 0 ? cols[phoneIdx] : undefined,
        };
      }).filter((c) => c.name || c.email);

      setCsvContacts(parsed);
    };
    reader.readAsText(file);
  }

  const totalRfmContacts = RFM_SEGMENTS
    .filter((s) => targetSegments.includes(s.value))
    .reduce((sum, s) => sum + s.count, 0);

  function handleContinue() {
    setMarketingContactSource(mode);
    setStep("marketing-content");
  }

  const canContinue =
    (mode === "rfm" && targetSegments.length > 0) ||
    (mode === "csv" && csvContacts.length > 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0">
        <button
          onClick={() => setStep("type-select")}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h2 className="text-sm font-semibold">Marketing Touch — Select Audience</h2>
          <p className="text-xs text-muted-foreground">Step 1 of 3</p>
        </div>
      </div>

      {/* Source toggle */}
      <div className="px-6 py-4 border-b flex-shrink-0">
        <div className="inline-flex rounded-lg border p-1 gap-1">
          <ModeButton active={mode === "rfm"} onClick={() => setMode("rfm")} icon={<Tag className="w-3.5 h-3.5" />}>
            RFM Segments
          </ModeButton>
          <ModeButton active={mode === "csv"} onClick={() => setMode("csv")} icon={<Upload className="w-3.5 h-3.5" />}>
            Upload CSV / Excel
          </ModeButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {mode === "rfm" && (
          <div className="max-w-2xl">
            <p className="text-sm text-muted-foreground mb-5">
              Select one or more RFM segments to target. Contacts from all selected segments will be included.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {RFM_SEGMENTS.map((seg) => {
                const active = targetSegments.includes(seg.value);
                return (
                  <button
                    key={seg.value}
                    onClick={() => toggleSegment(seg.value)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-medium">{seg.label}</span>
                      {active && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{seg.description}</p>
                    <span className="text-xs font-medium text-muted-foreground">{seg.count.toLocaleString()} contacts</span>
                  </button>
                );
              })}
            </div>

            {targetSegments.length > 0 && (
              <div className="bg-muted/40 rounded-xl px-4 py-3 text-sm mb-4">
                <span className="font-medium">{totalRfmContacts.toLocaleString()} contacts</span>
                <span className="text-muted-foreground"> across {targetSegments.length} segment{targetSegments.length !== 1 ? "s" : ""} selected</span>
              </div>
            )}
          </div>
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
                  File should include Name, Email (or Phone for SMS) columns
                </p>
                <span className="text-xs px-4 py-1.5 border rounded-lg hover:bg-accent transition-colors">
                  Choose file
                </span>
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

                <div className="border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_160px_140px] px-4 py-2 bg-muted/30 border-b text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Phone</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y">
                    {csvContacts.slice(0, 50).map((c, i) => (
                      <div key={i} className="grid grid-cols-[1fr_160px_140px] px-4 py-2.5 text-xs">
                        <span className="font-medium truncate">{c.name || "—"}</span>
                        <span className="text-muted-foreground truncate">{c.email || "—"}</span>
                        <span className="text-muted-foreground">{c.phone || "—"}</span>
                      </div>
                    ))}
                    {csvContacts.length > 50 && (
                      <div className="px-4 py-2 text-xs text-muted-foreground">
                        +{csvContacts.length - 50} more contacts
                      </div>
                    )}
                  </div>
                </div>
              </div>
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

      {/* Footer */}
      <div className="px-6 py-4 border-t flex-shrink-0">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          Next: Choose Channel <ArrowRight className="w-4 h-4" />
        </button>
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
