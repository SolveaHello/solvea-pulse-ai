"use client";

import { useState, useCallback } from "react";
import { Search, MapPin, Phone, Check, Star, ArrowRight, X } from "lucide-react";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";
import type { PlaceResult } from "@/lib/types";

export function SearchContactsStep() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoErrors, setPhotoErrors] = useState<Set<string>>(new Set());

  const { setStep, setSelectedContacts } = useCampaignSetupStore();

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    setResults([]);
    setSelected(new Set());
    try {
      const res = await fetch("/api/contacts/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  function toggle(placeId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map((r) => r.placeId)));
  }

  function handleContinue() {
    const contacts = results.filter((r) => selected.has(r.placeId));
    setSelectedContacts(contacts);
    setStep("set-goal");
  }

  const selectedList = results.filter((r) => selected.has(r.placeId));

  return (
    <div className="flex h-full">
      {/* Left: search + results */}
      <div className="flex-1 flex flex-col min-w-0 border-r">
        {/* Search bar */}
        <div className="p-5 border-b">
          <h2 className="text-base font-semibold mb-3">Search Target Businesses</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="e.g. dentists in Austin TX, coffee shops New York"
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={search}
              disabled={isSearching || !query.trim()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {isSearching ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Searching…
                </span>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search
                </>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <>
            <div className="px-5 py-2 border-b flex items-center justify-between bg-muted/30">
              <button onClick={selectAll} className="text-xs text-primary hover:underline">
                {selected.size === results.length ? "Deselect all" : "Select all"}
              </button>
              <span className="text-xs text-muted-foreground">
                {results.length} results · {selected.size} selected
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {results.map((r) => {
                const isSelected = selected.has(r.placeId);
                const firstPhoto = r.photos?.[0];
                const photoFailed = photoErrors.has(r.placeId);

                return (
                  <div
                    key={r.placeId}
                    onClick={() => toggle(r.placeId)}
                    className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded border mt-1 flex items-center justify-center transition-colors ${
                        isSelected ? "bg-primary border-primary" : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>

                    {/* Photo */}
                    {firstPhoto && !photoFailed ? (
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={firstPhoto}
                          alt={r.name}
                          className="w-full h-full object-cover"
                          onError={() =>
                            setPhotoErrors((prev) => { const n = new Set(prev); n.add(r.placeId); return n; })
                          }
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium leading-tight">{r.name}</span>
                        {r.rating && (
                          <span className="flex-shrink-0 flex items-center gap-0.5 text-xs text-amber-500">
                            <Star className="h-3 w-3 fill-amber-500" />
                            {r.rating}
                            {r.userRatingsTotal && (
                              <span className="text-muted-foreground ml-0.5">
                                ({r.userRatingsTotal})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{r.address}</span>
                      </div>
                      {r.phone ? (
                        <div className="flex items-center gap-1 text-xs text-green-600 mt-0.5">
                          <Phone className="h-3 w-3" />
                          {r.phone}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground/50 mt-0.5">
                          No phone listed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {results.length === 0 && !isSearching && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Search className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">Search for businesses to start your campaign</p>
          </div>
        )}
      </div>

      {/* Right: selected contacts panel */}
      <div className="w-72 flex flex-col bg-muted/20">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold">Selected Contacts</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedList.length} contact{selectedList.length !== 1 ? "s" : ""} selected
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {selectedList.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center mt-8">
              Select businesses from the search results
            </p>
          ) : (
            selectedList.map((r) => (
              <div
                key={r.placeId}
                className="flex items-start gap-2 bg-background rounded-lg p-2.5 border text-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  {r.phone && (
                    <div className="text-green-600 mt-0.5">{r.phone}</div>
                  )}
                </div>
                <button
                  onClick={() => toggle(r.placeId)}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={handleContinue}
            disabled={selectedList.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
          {selectedList.filter((r) => !r.phone).length > 0 && (
            <p className="text-xs text-amber-600 mt-2 text-center">
              {selectedList.filter((r) => !r.phone).length} selected have no phone number
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
