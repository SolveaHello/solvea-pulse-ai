"use client";

import { useState } from "react";
import {
  Users, Phone, Mail, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, MessageSquare, UserCog,
} from "lucide-react";
import { useSalesReps } from "@/lib/stores/salesReps";
import { AssignLeadModal } from "./AssignLeadModal";

const DISPOSITION_CONFIG: Record<string, { label: string; color: string }> = {
  INTERESTED: { label: "Interested", color: "bg-orange-100 text-orange-700" },
  CALLBACK_REQUESTED: { label: "Callback", color: "bg-blue-100 text-blue-700" },
  CONFIRMED: { label: "Confirmed", color: "bg-indigo-100 text-indigo-700" },
  CONVERTED: { label: "Converted", color: "bg-emerald-100 text-emerald-700" },
  NOT_INTERESTED: { label: "Not Interested", color: "bg-gray-100 text-gray-500" },
};

interface Lead {
  id: string;
  name?: string;
  businessName?: string;
  phone: string;
  email?: string;
  address?: string;
  website?: string;
  disposition: string;
  assignedTo?: string;
  confirmedAt?: string;
  convertedAt?: string;
  createdAt: string;
  calls: { id: string; duration?: number; endedAt?: string; summary?: { summary: string; sentiment?: string; keyPoints: string[]; nextAction?: string } }[];
  followUps: { id: string; channel: string; status: string; sentAt?: string }[];
  contactList: { campaign: { id: string; name: string } };
}

export function LeadsTable({
  leads,
  userId,
  campaigns,
}: {
  leads: Lead[];
  userId: string;
  campaigns: { id: string; name: string }[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [assigningLead, setAssigningLead] = useState<{ id: string; name: string } | null>(null);
  const { assignments, getRepById } = useSalesReps();

  async function handleAction(
    leadId: string,
    action: "confirm" | "convert" | "reject",
    assignedTo?: string
  ) {
    setLoadingId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function handleFollowUp(leadId: string, campaignId: string, callId?: string, channel = "EMAIL") {
    setLoadingId(leadId);
    try {
      const res = await fetch("/api/followups/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: leadId, campaignId, callId, channel }),
      });
      if (res.ok) {
        alert("Follow-up sent!");
        window.location.reload();
      }
    } finally {
      setLoadingId(null);
    }
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-xl">
        <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No leads match the current filter.</p>
      </div>
    );
  }

  return (
    <>
    {assigningLead && (
      <AssignLeadModal
        leadId={assigningLead.id}
        leadName={assigningLead.name}
        currentRepId={assignments[assigningLead.id]}
        onClose={() => setAssigningLead(null)}
      />
    )}
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[1fr_120px_130px_160px_160px] gap-4 px-4 py-2 text-xs text-muted-foreground uppercase tracking-wide border-b">
        <span>Contact</span>
        <span>Disposition</span>
        <span>Campaign</span>
        <span>Assigned To</span>
        <span>Actions</span>
      </div>

      {leads.map((lead) => {
        const cfg = DISPOSITION_CONFIG[lead.disposition];
        const displayName = lead.businessName || lead.name || lead.phone;
        const latestCall = lead.calls[0];
        const isExpanded = expandedId === lead.id;
        const isLoading = loadingId === lead.id;
        const pendingFollowUp = lead.followUps.some(
          (f) => f.status === "PENDING" || f.status === "SENT"
        );

        const assignedRepId = assignments[lead.id];
        const assignedRep = assignedRepId ? getRepById(assignedRepId) : undefined;

        return (
          <div key={lead.id} className="border rounded-lg overflow-hidden">
            <div
              className="grid grid-cols-[1fr_120px_130px_160px_160px] gap-4 px-4 py-3 items-center hover:bg-accent/20 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : lead.id)}
            >
              {/* Contact info */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{displayName}</p>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {lead.phone && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {lead.phone}
                    </span>
                  )}
                  {lead.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {lead.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Disposition */}
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${cfg?.color || "bg-gray-100 text-gray-600"}`}
              >
                {cfg?.label || lead.disposition}
              </span>

              {/* Campaign */}
              <p className="text-xs text-muted-foreground truncate">
                {lead.contactList.campaign.name}
              </p>

              {/* Assigned To */}
              <div onClick={(e) => e.stopPropagation()}>
                {lead.disposition === "CONFIRMED" || lead.disposition === "CONVERTED" ? (
                  assignedRep ? (
                    <button
                      onClick={() => setAssigningLead({ id: lead.id, name: displayName })}
                      className="flex items-center gap-1.5 group border rounded-full pl-0.5 pr-2.5 py-0.5 hover:bg-accent transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {assignedRep.avatar}
                      </div>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors max-w-[80px] truncate">
                        {assignedRep.name}
                      </span>
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">Unassigned</span>
                  )
                ) : null}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {lead.disposition === "INTERESTED" && (
                  <button
                    disabled={isLoading}
                    onClick={() => handleAction(lead.id, "confirm")}
                    className="text-xs px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    Confirm
                  </button>
                )}
                {lead.disposition === "CONFIRMED" && (
                  <button
                    disabled={isLoading}
                    onClick={() => setAssigningLead({ id: lead.id, name: displayName })}
                    className="text-xs px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    Converted
                  </button>
                )}
                {(lead.disposition === "INTERESTED" || lead.disposition === "CALLBACK_REQUESTED") && !pendingFollowUp && (
                  <button
                    disabled={isLoading}
                    onClick={() =>
                      handleFollowUp(
                        lead.id,
                        lead.contactList.campaign.id,
                        latestCall?.id,
                        lead.email ? "EMAIL" : "SMS"
                      )
                    }
                    className="text-xs px-2.5 py-1 rounded border hover:bg-accent disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    <Mail className="h-3 w-3" />
                    Follow-up
                  </button>
                )}
                {lead.disposition === "CONVERTED" && (
                  <button
                    disabled={isLoading}
                    onClick={() => setAssigningLead({ id: lead.id, name: displayName })}
                    className="text-xs px-2.5 py-1 rounded border text-violet-600 hover:bg-violet-50 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    <UserCog className="h-3.5 w-3.5" />
                    Reassign
                  </button>
                )}
                {lead.disposition !== "NOT_INTERESTED" && lead.disposition !== "CONVERTED" && (
                  <button
                    disabled={isLoading}
                    onClick={() => handleAction(lead.id, "reject")}
                    className="text-xs px-2.5 py-1 rounded border text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t px-4 py-4 bg-muted/20 grid grid-cols-2 gap-4">
                {/* Call summary */}
                {latestCall?.summary ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Call Summary
                    </p>
                    <p className="text-sm">{latestCall.summary.summary}</p>
                    {latestCall.summary.keyPoints?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {latestCall.summary.keyPoints.map((pt: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                            <span className="text-primary">•</span> {pt}
                          </li>
                        ))}
                      </ul>
                    )}
                    {latestCall.summary.nextAction && (
                      <p className="mt-2 text-xs text-blue-600">
                        Next: {latestCall.summary.nextAction}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Call Summary
                    </p>
                    <p className="text-sm text-muted-foreground">No summary available.</p>
                  </div>
                )}

                {/* Follow-ups */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Follow-ups
                  </p>
                  {lead.followUps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None sent yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {lead.followUps.map((fu) => (
                        <li key={fu.id} className="flex items-center gap-2 text-xs">
                          {fu.channel === "EMAIL" ? (
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="capitalize">{fu.status.toLowerCase()}</span>
                          {fu.sentAt && (
                            <span className="text-muted-foreground">
                              {new Date(fu.sentAt).toLocaleDateString()}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
    </>
  );
}
