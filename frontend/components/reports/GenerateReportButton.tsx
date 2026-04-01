"use client";

import { useState } from "react";
import { BarChart2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  campaigns: { id: string; name: string }[];
  variant?: "default" | "outline";
}

export function GenerateReportButton({ userId, campaigns, variant = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const router = useRouter();

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          campaignId: campaignId || undefined,
          reportDate,
        }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  const btnClass =
    variant === "outline"
      ? "inline-flex items-center gap-2 border px-4 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
      : "inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors";

  return (
    <>
      <button onClick={() => setOpen(true)} className={btnClass}>
        <BarChart2 className="h-4 w-4" />
        Generate Report
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-background border rounded-xl p-6 w-[400px] shadow-lg">
            <h2 className="font-semibold text-lg mb-4">Generate Daily Report</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Report Date
                </label>
                <input
                  type="date"
                  value={reportDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Campaign (optional — leave blank for all)
                </label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">All Campaigns</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={generate}
                disabled={loading}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
