"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Phone } from "lucide-react";

const STORAGE_KEY = "user_phone";

export function PhoneSaveForm() {
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSaved(stored);
      setPhone(stored);
    }
  }, []);

  function save() {
    const trimmed = phone.trim();
    if (!trimmed) return;
    localStorage.setItem(STORAGE_KEY, trimmed);
    setSaved(trimmed);
  }

  return (
    <div className="space-y-3">
      {saved && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>Saved: <strong>{saved}</strong></span>
        </div>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="+1 555 000 0000"
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={save}
          disabled={!phone.trim()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          Save
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        This number will be used as the destination for test calls and campaign previews.
      </p>
    </div>
  );
}

export function getSavedPhone(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}
