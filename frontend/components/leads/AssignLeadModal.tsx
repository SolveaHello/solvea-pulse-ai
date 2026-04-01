"use client";

import { useState } from "react";
import { X, UserCircle2, Check } from "lucide-react";
import { useSalesReps } from "@/lib/stores/salesReps";

interface Props {
  leadId: string;
  leadName: string;
  currentRepId?: string;
  onClose: () => void;
}

export function AssignLeadModal({ leadId, leadName, currentRepId, onClose }: Props) {
  const { reps, assignLead, unassignLead } = useSalesReps();
  const activeReps = reps.filter((r) => r.active);
  const [selected, setSelected] = useState<string | null>(currentRepId ?? null);

  function confirm() {
    if (selected) {
      assignLead(leadId, selected);
    } else {
      unassignLead(leadId);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-background border rounded-xl w-[380px] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="font-semibold text-sm">Assign Lead</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[280px]">{leadName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Rep list */}
        <div className="divide-y max-h-72 overflow-y-auto">
          {/* Unassign option */}
          <button
            onClick={() => setSelected(null)}
            className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent/40 ${
              selected === null ? "bg-accent/30" : ""
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <UserCircle2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Unassigned</span>
            {selected === null && <Check className="h-4 w-4 text-primary ml-auto" />}
          </button>

          {activeReps.map((rep) => (
            <button
              key={rep.id}
              onClick={() => setSelected(rep.id)}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent/40 ${
                selected === rep.id ? "bg-accent/30" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {rep.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{rep.name}</p>
                <p className="text-xs text-muted-foreground">{rep.role}</p>
              </div>
              {selected === rep.id && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t bg-muted/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
