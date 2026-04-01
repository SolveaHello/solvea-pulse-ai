import { create } from "zustand";

export interface SalesRep {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string; // initials
  active: boolean;
}

// Default demo reps
const DEFAULT_REPS: SalesRep[] = [
  { id: "rep-1", name: "Alex Rivera",  email: "alex@outboundai.com",   role: "Senior SDR",       avatar: "AR", active: true },
  { id: "rep-2", name: "Jordan Lee",   email: "jordan@outboundai.com", role: "SDR",               avatar: "JL", active: true },
  { id: "rep-3", name: "Sam Chen",     email: "sam@outboundai.com",    role: "Account Executive", avatar: "SC", active: true },
];

interface SalesRepsState {
  reps: SalesRep[];
  // leadId → repId
  assignments: Record<string, string>;
  addRep: (rep: Omit<SalesRep, "id" | "avatar">) => void;
  removeRep: (repId: string) => void;
  toggleActive: (repId: string) => void;
  assignLead: (leadId: string, repId: string) => void;
  unassignLead: (leadId: string) => void;
  getRepById: (repId: string) => SalesRep | undefined;
}

export const useSalesReps = create<SalesRepsState>()((set, get) => ({
  reps: DEFAULT_REPS,
  assignments: {
    "lead-3": "rep-1", // Lisa Patel → Alex Rivera
    "lead-4": "rep-2", // David Kim  → Jordan Lee
  },

  addRep: (data) => {
    const initials = data.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const rep: SalesRep = { ...data, id: `rep-${Date.now()}`, avatar: initials, active: true };
    set((s) => ({ reps: [...s.reps, rep] }));
  },

  removeRep: (repId) =>
    set((s) => ({
      reps: s.reps.filter((r) => r.id !== repId),
      assignments: Object.fromEntries(
        Object.entries(s.assignments).filter(([, v]) => v !== repId)
      ),
    })),

  toggleActive: (repId) =>
    set((s) => ({
      reps: s.reps.map((r) => (r.id === repId ? { ...r, active: !r.active } : r)),
    })),

  assignLead: (leadId, repId) =>
    set((s) => ({ assignments: { ...s.assignments, [leadId]: repId } })),

  unassignLead: (leadId) =>
    set((s) => {
      const next = { ...s.assignments };
      delete next[leadId];
      return { assignments: next };
    }),

  getRepById: (repId) => get().reps.find((r) => r.id === repId),
}));
