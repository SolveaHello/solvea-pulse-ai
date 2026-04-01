"use client";

import { useState } from "react";
import { UserPlus, Trash2, ToggleLeft, ToggleRight, Users, Mail, Briefcase } from "lucide-react";
import { useSalesReps, type SalesRep } from "@/lib/stores/salesReps";

// Mock lead assignments summary (in real app this would come from the store)
const MOCK_LEADS = [
  { id: "lead-1", name: "Nail Studio NYC",      disposition: "INTERESTED" },
  { id: "lead-2", name: "Chen's Barbershop",    disposition: "CALLBACK_REQUESTED" },
  { id: "lead-3", name: "Glow Beauty Lounge",   disposition: "CONFIRMED" },
  { id: "lead-4", name: "Kim's Auto Detail",    disposition: "CONVERTED" },
  { id: "lead-5", name: "Lotus Wellness Spa",   disposition: "INTERESTED" },
];

const DISPOSITION_COLOR: Record<string, string> = {
  INTERESTED:         "bg-orange-100 text-orange-700",
  CALLBACK_REQUESTED: "bg-blue-100 text-blue-700",
  CONFIRMED:          "bg-indigo-100 text-indigo-700",
  CONVERTED:          "bg-emerald-100 text-emerald-700",
};

export default function TeamPage() {
  const { reps, assignments, addRep, removeRep, toggleActive } = useSalesReps();
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "SDR" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleAdd() {
    if (!form.name.trim() || !form.email.trim()) return;
    addRep({ name: form.name.trim(), email: form.email.trim(), role: form.role, active: true });
    setForm({ name: "", email: "", role: "SDR" });
    setShowAddForm(false);
  }

  // Build per-rep lead count
  const repLeadCounts = Object.entries(assignments).reduce(
    (acc, [leadId, repId]) => {
      acc[repId] = [...(acc[repId] || []), leadId];
      return acc;
    },
    {} as Record<string, string[]>
  );

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Sales Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage reps and review their lead assignments
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" /> Add Rep
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="border rounded-xl p-5 mb-6 bg-muted/20">
          <p className="font-semibold text-sm mb-4">New Sales Rep</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Full Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Smith"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Email *</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@company.com"
                type="email"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option>SDR</option>
                <option>Senior SDR</option>
                <option>Account Executive</option>
                <option>Sales Manager</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!form.name.trim() || !form.email.trim()}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Add Rep
            </button>
          </div>
        </div>
      )}

      {/* Team list */}
      <div className="space-y-3">
        {reps.map((rep) => {
          const myLeadIds = repLeadCounts[rep.id] || [];
          const myLeads = MOCK_LEADS.filter((l) => myLeadIds.includes(l.id));
          const converted = myLeads.filter((l) => l.disposition === "CONVERTED").length;

          return (
            <div key={rep.id} className={`border rounded-xl overflow-hidden ${!rep.active ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  rep.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {rep.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{rep.name}</p>
                    {!rep.active && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{rep.role}</span>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{rep.email}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-center">
                  <a href={`/leads`} className="hover:opacity-80 transition-opacity">
                    <div className="text-lg font-bold">{myLeadIds.length}</div>
                    <div className="text-xs text-muted-foreground">Assigned</div>
                  </a>
                  <a href={`/leads?disposition=CONVERTED`} className="hover:opacity-80 transition-opacity">
                    <div className="text-lg font-bold text-emerald-600">{converted}</div>
                    <div className="text-xs text-muted-foreground">Converted</div>
                  </a>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleActive(rep.id)}
                    title={rep.active ? "Deactivate" : "Activate"}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {rep.active
                      ? <ToggleRight className="h-5 w-5 text-primary" />
                      : <ToggleLeft className="h-5 w-5" />
                    }
                  </button>
                  {confirmDeleteId === rep.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-red-600">Remove?</span>
                      <button
                        onClick={() => { removeRep(rep.id); setConfirmDeleteId(null); }}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >Yes</button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs px-2 py-1 border rounded hover:bg-accent transition-colors"
                      >No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(rep.id)}
                      className="text-muted-foreground hover:text-red-600 transition-colors p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Assigned leads preview */}
              {myLeads.length > 0 && (
                <div className="border-t px-5 py-3 bg-muted/10 flex flex-wrap gap-2">
                  {myLeads.map((lead) => (
                    <a
                      key={lead.id}
                      href={`/leads?disposition=${lead.disposition}`}
                      className="flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 bg-background hover:bg-accent transition-colors"
                    >
                      <span>{lead.name}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${DISPOSITION_COLOR[lead.disposition] || "bg-gray-100 text-gray-600"}`}>
                        {lead.disposition.replace("_", " ")}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
