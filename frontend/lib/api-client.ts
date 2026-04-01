import type {
  Campaign,
  Contact,
  ContactList,
  Call,
  PlaceResult,
  CampaignStats,
} from "@/lib/types";

const API_BASE = "";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Campaigns ─────────────────────────────────────────────────────────────

export const campaignApi = {
  list: () => request<Campaign[]>("/api/campaigns"),
  get: (id: string) => request<Campaign>(`/api/campaigns/${id}`),
  create: (data: Partial<Campaign>) =>
    request<Campaign>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Campaign>) =>
    request<Campaign>(`/api/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/api/campaigns/${id}`, { method: "DELETE" }),
  execute: (id: string) =>
    request<{ jobId: string }>(`/api/campaigns/${id}/execute`, {
      method: "POST",
    }),
  getStats: (id: string) =>
    request<CampaignStats>(`/api/campaigns/${id}/stats`),
};

// ── Contacts ───────────────────────────────────────────────────────────────

export const contactApi = {
  searchMaps: (query: string) =>
    request<PlaceResult[]>("/api/contacts/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
  addManual: (campaignId: string, contacts: Partial<Contact>[]) =>
    request<Contact[]>("/api/contacts/manual", {
      method: "POST",
      body: JSON.stringify({ campaignId, contacts }),
    }),
  uploadFile: async (campaignId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("campaignId", campaignId);
    const res = await fetch("/api/contacts/upload", {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Contact[]>;
  },
  listForCampaign: (campaignId: string) =>
    request<ContactList[]>(`/api/contacts?campaignId=${campaignId}`),
};

// ── Phone Verification ─────────────────────────────────────────────────────

export const phoneVerifyApi = {
  send: (phone: string) =>
    request<{ sent: boolean }>("/api/phone-verify/send", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  confirm: (phone: string, code: string) =>
    request<{ verified: boolean }>("/api/phone-verify/confirm", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),
};

// ── Calls ──────────────────────────────────────────────────────────────────

export const callApi = {
  get: (id: string) => request<Call>(`/api/calls/${id}`),
  listForCampaign: (campaignId: string) =>
    request<Call[]>(`/api/calls?campaignId=${campaignId}`),
};
