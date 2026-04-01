"use client";

import { useState, useCallback } from "react";
import { Search, MapPin, Phone, Plus, Check, PhoneCall, Loader2 } from "lucide-react";
import { contactApi } from "@/lib/api-client";
import type { PlaceResult } from "@/lib/types";

interface GoogleMapsSearchProps {
  campaignId: string;
  assistantId?: string;
  onImport?: (count: number) => void;
}

export function GoogleMapsSearch({ campaignId, assistantId, onImport }: GoogleMapsSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [callingPhone, setCallingPhone] = useState<string | null>(null);
  const [callMessage, setCallMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const data = await contactApi.searchMaps(query);
      setResults(data);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  function toggleSelect(placeId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r) => r.placeId)));
    }
  }

  async function importSelected() {
    const toImport = results.filter(
      (r) => selected.has(r.placeId) && r.phone
    );
    if (toImport.length === 0) return;

    setIsImporting(true);
    try {
      await contactApi.addManual(
        campaignId,
        toImport.map((r) => ({
          phone: r.phone!,
          businessName: r.name,
          address: r.address,
          website: r.website,
          placeId: r.placeId,
        }))
      );
      onImport?.(toImport.length);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }

  async function quickCall(phone: string) {
    setCallingPhone(phone);
    setCallMessage(null);
    try {
      const res = await fetch("/api/calls/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, assistantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCallMessage({ type: "error", text: data.error ?? "Call failed" });
      } else {
        setCallMessage({ type: "success", text: `Calling ${phone}…` });
      }
    } catch (err) {
      setCallMessage({ type: "error", text: err instanceof Error ? err.message : "Call failed" });
    } finally {
      setCallingPhone(null);
    }
  }

  const selectedWithPhone = results.filter(
    (r) => selected.has(r.placeId) && r.phone
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="e.g. dentists in Austin TX, coffee shops NYC"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={search}
          disabled={isSearching || !query.trim()}
          className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
      )}

      {callMessage && (
        <div
          className={`text-sm rounded-lg p-3 ${
            callMessage.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {callMessage.text}
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="flex justify-between items-center">
            <button
              onClick={selectAll}
              className="text-xs text-primary hover:underline"
            >
              {selected.size === results.length ? "Deselect all" : "Select all"}
            </button>
            <span className="text-xs text-muted-foreground">
              {results.length} results · {selected.size} selected
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((r) => (
              <div
                key={r.placeId}
                onClick={() => toggleSelect(r.placeId)}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected.has(r.placeId)
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                }`}
              >
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded border mt-0.5 flex items-center justify-center ${
                    selected.has(r.placeId)
                      ? "bg-primary border-primary"
                      : "border-border"
                  }`}
                >
                  {selected.has(r.placeId) && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{r.address}</span>
                  </div>
                  {r.phone ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Phone className="h-3 w-3" />
                        {r.phone}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          quickCall(r.phone!);
                        }}
                        disabled={callingPhone === r.phone}
                        title="Quick call"
                        className="flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {callingPhone === r.phone ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <PhoneCall className="h-3 w-3" />
                        )}
                        Call
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground/60 mt-0.5">
                      No phone available
                    </div>
                  )}
                </div>
                {r.rating && (
                  <div className="text-xs text-muted-foreground flex-shrink-0">
                    ★ {r.rating}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={importSelected}
            disabled={isImporting || selectedWithPhone === 0}
            className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {isImporting
              ? "Importing..."
              : `Import ${selectedWithPhone} contact${selectedWithPhone !== 1 ? "s" : ""} with phone`}
          </button>
        </>
      )}
    </div>
  );
}
