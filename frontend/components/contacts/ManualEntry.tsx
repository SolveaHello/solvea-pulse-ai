"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle } from "lucide-react";
import { contactApi } from "@/lib/api-client";

interface ManualEntryProps {
  campaignId: string;
  onImport?: (count: number) => void;
}

interface Row {
  phone: string;
  name: string;
  email: string;
  businessName: string;
}

const EMPTY_ROW: Row = { phone: "", name: "", email: "", businessName: "" };

export function ManualEntry({ campaignId, onImport }: ManualEntryProps) {
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY_ROW }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateRow(idx: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    const valid = rows.filter((r) => r.phone.trim());
    if (valid.length === 0) {
      setError("At least one phone number is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await contactApi.addManual(campaignId, valid);
      setSuccess(`Added ${valid.length} contact${valid.length !== 1 ? "s" : ""}`);
      onImport?.(valid.length);
      setRows([{ ...EMPTY_ROW }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contacts");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left pb-2 pr-3 text-muted-foreground font-medium">
                Phone *
              </th>
              <th className="text-left pb-2 pr-3 text-muted-foreground font-medium">
                Name
              </th>
              <th className="text-left pb-2 pr-3 text-muted-foreground font-medium">
                Business
              </th>
              <th className="text-left pb-2 text-muted-foreground font-medium">Email</th>
              <th className="pb-2 w-8" />
            </tr>
          </thead>
          <tbody className="space-y-2">
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b last:border-0">
                {(["phone", "name", "businessName", "email"] as const).map((field) => (
                  <td key={field} className="py-1.5 pr-3">
                    <input
                      value={row[field]}
                      onChange={(e) => updateRow(idx, field, e.target.value)}
                      placeholder={field === "phone" ? "+1..." : ""}
                      className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </td>
                ))}
                <td className="py-1.5">
                  <button
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                    className="text-muted-foreground hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addRow}
        className="flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Plus className="h-4 w-4" /> Add row
      </button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}

      <button
        onClick={submit}
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? "Adding..." : "Add Contacts"}
      </button>
    </div>
  );
}
