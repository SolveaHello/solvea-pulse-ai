"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Search, MapPin, Phone, Mail, Star, Check, X,
  CheckCircle2, Download, Clock, CalendarDays, ChevronLeft,
  FileText, Building2,
} from "lucide-react";
import type { PlaceResult } from "@/lib/types";

// ── Types ──────────────────────────────────────────────────────────────────────
type MockBusiness = PlaceResult & { email: string; description: string };

export interface MapConfirmData {
  contacts: MockBusiness[];
  outboundPhone: string;
  objective: string;
  scheduleAt: string | null; // ISO string or null = call now
}

interface MapSearchCardProps {
  onConfirm: (data: MapConfirmData) => void;
  confirmed?: boolean;
  confirmedData?: MapConfirmData;
}

// ── Mock business data ─────────────────────────────────────────────────────────
const ALL_BUSINESSES: MockBusiness[] = [
  { placeId: "b-01", name: "Austin Family Dental", address: "1234 Lamar Blvd, Austin, TX 78703", phone: "(512) 555-0101", email: "hello@austinfamilydental.com", rating: 4.8, userRatingsTotal: 312, description: "Full-service family dental clinic offering cleanings, braces, and cosmetic procedures." },
  { placeId: "b-02", name: "Sunshine Wellness Spa", address: "890 Congress Ave, Austin, TX 78701", phone: "(512) 555-0202", email: "book@sunshinewellness.com", rating: 4.6, userRatingsTotal: 145, description: "Full-service wellness spa with massage, facials, and holistic treatments." },
  { placeId: "b-03", name: "Peak Performance Gym", address: "567 N Loop Blvd, Austin, TX 78751", phone: "(512) 555-0303", email: "info@peakperformancegym.com", rating: 4.5, userRatingsTotal: 278, description: "24-hour gym with personal trainers, group classes, and state-of-the-art equipment." },
  { placeId: "b-04", name: "Greenleaf Landscaping", address: "2345 S 1st St, Austin, TX 78704", phone: "(512) 555-0404", email: "quote@greenleaflandscaping.com", rating: 4.7, userRatingsTotal: 89, description: "Commercial and residential landscaping, lawn care, and irrigation services." },
  { placeId: "b-05", name: "Metro Auto Repair", address: "789 W 6th St, Austin, TX 78701", phone: "(512) 555-0505", email: "service@metroautorepair.com", rating: 4.4, userRatingsTotal: 201, description: "Full-service auto repair specializing in domestic and import vehicle maintenance." },
  { placeId: "b-06", name: "Bright Minds Tutoring", address: "321 Barton Springs Rd, Austin, TX 78704", phone: "(512) 555-0606", email: "enroll@brightmindstutoring.com", rating: 4.9, userRatingsTotal: 56, description: "K-12 tutoring services in math, science, reading, and SAT/ACT preparation." },
  { placeId: "b-07", name: "CloudNine Cleaning Co.", address: "456 E Riverside Dr, Austin, TX 78704", phone: "(512) 555-0707", email: "clean@cloudnineco.com", rating: 4.6, userRatingsTotal: 167, description: "Professional residential and commercial cleaning with eco-friendly products." },
  { placeId: "b-08", name: "Lonestar Insurance Agency", address: "1120 S Congress Ave, Austin, TX 78704", phone: "(512) 555-0808", email: "contact@lonestarins.com", rating: 4.3, userRatingsTotal: 93, description: "Independent agency offering auto, home, life, and small business insurance." },
  { placeId: "b-09", name: "Riverside Veterinary Clinic", address: "908 S Lamar Blvd, Austin, TX 78704", phone: "(512) 555-0909", email: "appt@riversidevet.com", rating: 4.8, userRatingsTotal: 421, description: "Compassionate veterinary care for dogs, cats, and exotic animals." },
  { placeId: "b-10", name: "Artisan Coffee Roasters", address: "234 W 2nd St, Austin, TX 78701", phone: "(512) 555-1010", email: "wholesale@artisancoffee.com", rating: 4.7, userRatingsTotal: 538, description: "Specialty roaster offering single-origin beans, espresso blends, and B2B wholesale." },
  { placeId: "b-11", name: "First Step Physical Therapy", address: "3456 Duval St, Austin, TX 78705", phone: "(512) 555-1111", email: "intake@firststeppt.com", rating: 4.9, userRatingsTotal: 184, description: "Sports rehab and physical therapy for injury recovery and performance enhancement." },
  { placeId: "b-12", name: "HomeChef Catering", address: "678 Airport Blvd, Austin, TX 78751", phone: "(512) 555-1212", email: "events@homechefcatering.com", rating: 4.5, userRatingsTotal: 73, description: "Custom catering for corporate events, weddings, and private upscale parties." },
  { placeId: "b-13", name: "Secure Vault Storage", address: "1567 Rundberg Ln, Austin, TX 78758", phone: "(512) 555-1313", email: "storage@securevault.com", rating: 4.2, userRatingsTotal: 98, description: "Climate-controlled self-storage with 24/7 access and advanced security systems." },
  { placeId: "b-14", name: "Digital Pixel Studios", address: "445 W 17th St, Austin, TX 78701", phone: "(512) 555-1414", email: "hello@digitalpixelstudios.com", rating: 4.6, userRatingsTotal: 62, description: "Creative agency specializing in branding, web design, and video production." },
  { placeId: "b-15", name: "Austin Pet Grooming", address: "2890 S MoPac Expy, Austin, TX 78746", phone: "(512) 555-1515", email: "grooming@austinpetcare.com", rating: 4.7, userRatingsTotal: 215, description: "Mobile and in-salon grooming for all breeds, including nail trim and bath packages." },
  { placeId: "b-16", name: "Summit Realty Group", address: "801 Barton Springs Rd, Austin, TX 78704", phone: "(512) 555-1616", email: "agents@summitrealty.com", rating: 4.5, userRatingsTotal: 147, description: "Boutique real estate agency focused on residential and investment properties." },
  { placeId: "b-17", name: "Elite Event Rentals", address: "5678 Burnet Rd, Austin, TX 78756", phone: "(512) 555-1717", email: "rent@eliteeventrentals.com", rating: 4.4, userRatingsTotal: 88, description: "Party and event equipment rentals: tents, tables, AV, and ambient lighting." },
  { placeId: "b-18", name: "TechFix IT Solutions", address: "2233 Guadalupe St, Austin, TX 78705", phone: "(512) 555-1818", email: "support@techfixaustin.com", rating: 4.6, userRatingsTotal: 129, description: "Business IT support, network design, cybersecurity audits, and managed services." },
  { placeId: "b-19", name: "Harvest Moon Farm Market", address: "4512 E 51st St, Austin, TX 78723", phone: "(512) 555-1919", email: "orders@harvestmoonfarm.com", rating: 4.8, userRatingsTotal: 302, description: "Local organic farm with CSA boxes, seasonal produce, and farm-to-table delivery." },
  { placeId: "b-20", name: "BlueSky HVAC Services", address: "1890 Metric Blvd, Austin, TX 78758", phone: "(512) 555-2020", email: "service@blueskyhvac.com", rating: 4.5, userRatingsTotal: 176, description: "Residential and commercial HVAC installation, repair, and seasonal maintenance." },
];

// ── CSV helpers ────────────────────────────────────────────────────────────────
function generateCSV(contacts: MockBusiness[]): string {
  const header = "Name,Phone,Email,Address,Description";
  const rows = contacts.map((c) =>
    [`"${c.name}"`, `"${c.phone ?? ""}"`, `"${c.email ?? ""}"`, `"${c.address ?? ""}"`, `"${c.description ?? ""}"`].join(",")
  );
  return [header, ...rows].join("\n");
}

function downloadCSV(contacts: MockBusiness[]) {
  const csv = generateCSV(contacts);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "contacts.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ─────────────────────────────────────────────────────────────
export function MapSearchCard({ onConfirm, confirmed, confirmedData }: MapSearchCardProps) {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<"search" | "setup">("search");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<MockBusiness[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Setup phase state
  const [outboundPhone, setOutboundPhone] = useState("+1 (512) 555-0000");
  const [objective, setObjective] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");

  // Pre-fill today's date for schedule picker
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setScheduleDate(d.toISOString().slice(0, 10));
  }, []);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResults([]);
    setSelected(new Set());

    await new Promise((r) => setTimeout(r, 1100)); // realistic delay

    const q = query.toLowerCase();
    const filtered = ALL_BUSINESSES.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
    // If no keyword match, return a random 12-16 subset
    setResults(
      filtered.length > 0
        ? filtered
        : ALL_BUSINESSES.slice(0, 12 + Math.floor(Math.random() * 5))
    );
    setIsSearching(false);
  }, [query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function selectAll() {
    setSelected(
      selected.size === results.length ? new Set() : new Set(results.map((r) => r.placeId))
    );
  }

  const selectedContacts = results.filter((r) => selected.has(r.placeId));

  function handleConfirm() {
    let scheduleAt: string | null = null;
    if (scheduleMode === "schedule" && scheduleDate) {
      scheduleAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    }
    onConfirm({ contacts: selectedContacts, outboundPhone, objective, scheduleAt });
  }

  // ── Confirmed summary ──────────────────────────────────────────────────────
  if (confirmed && confirmedData) {
    return (
      <div className="flex flex-wrap items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span className="text-green-800 font-medium">
          {confirmedData.contacts.length} contacts · {confirmedData.outboundPhone}
        </span>
        <span className="text-green-600 text-xs">
          {confirmedData.scheduleAt
            ? `Scheduled ${new Date(confirmedData.scheduleAt).toLocaleString()}`
            : "Calling now"}
        </span>
      </div>
    );
  }

  // ── Setup phase ────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="border border-border rounded-2xl overflow-hidden bg-background shadow-sm w-full">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <button
            onClick={() => setPhase("search")}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Campaign Setup</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {selectedContacts.length} contacts
          </span>
        </div>

        <div className="p-4 space-y-5">
          {/* CSV preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Contact List
              </p>
              <button
                onClick={() => downloadCSV(selectedContacts)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Download className="h-3 w-3" />
                Download CSV
              </button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_140px_180px] text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 border-b font-medium uppercase tracking-wide">
                <span>Business</span>
                <span>Phone</span>
                <span>Email</span>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y">
                {selectedContacts.map((c) => (
                  <div
                    key={c.placeId}
                    className="grid grid-cols-[1fr_140px_180px] px-3 py-2 text-xs hover:bg-muted/20"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate font-medium">{c.name}</span>
                    </div>
                    <span className="text-muted-foreground truncate">{c.phone}</span>
                    <span className="text-muted-foreground truncate">{c.email}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Outbound phone */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              <Phone className="h-3 w-3 inline mr-1" />
              Outbound Number
            </label>
            <input
              value={outboundPhone}
              onChange={(e) => setOutboundPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Objective */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Campaign Objective
            </label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="e.g. Introduce our marketing software and book a 15-min demo call"
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Schedule */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              When to Call
            </p>
            <div className="flex gap-3 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  checked={scheduleMode === "now"}
                  onChange={() => setScheduleMode("now")}
                  className="accent-primary"
                />
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">Call now</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  checked={scheduleMode === "schedule"}
                  onChange={() => setScheduleMode("schedule")}
                  className="accent-primary"
                />
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">Schedule</span>
              </label>
            </div>
            {scheduleMode === "schedule" && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={!outboundPhone.trim() || !objective.trim()}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Confirm &amp; Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── Search phase ───────────────────────────────────────────────────────────
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-background shadow-sm w-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Search Businesses</span>
      </div>

      {/* Search input */}
      <div className="p-3 border-b">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="e.g. dental clinics in Austin TX"
              className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={search}
            disabled={isSearching || !query.trim()}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            {isSearching ? (
              <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            {isSearching ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isSearching && (
        <div className="p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-center animate-pulse">
              <div className="w-4 h-4 bg-muted rounded flex-shrink-0" />
              <div className="w-10 h-10 bg-muted rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2.5 bg-muted rounded w-1/2" />
                <div className="h-2.5 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !isSearching && (
        <>
          <div className="px-3 py-1.5 border-b bg-muted/20 flex items-center justify-between">
            <button onClick={selectAll} className="text-xs text-primary hover:underline">
              {selected.size === results.length ? "Deselect all" : "Select all"}
            </button>
            <span className="text-xs text-muted-foreground">
              {results.length} results · {selected.size} selected
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y">
            {results.map((r) => {
              const isSelected = selected.has(r.placeId);
              return (
                <div
                  key={r.placeId}
                  onClick={() => toggle(r.placeId)}
                  className={`flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected ? "bg-primary border-primary" : "border-border"
                    }`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>

                  {/* Icon placeholder */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary/50" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold truncate">{r.name}</span>
                      {r.rating && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-500 flex-shrink-0">
                          <Star className="h-2.5 w-2.5 fill-amber-500" />
                          {r.rating}
                          <span className="text-muted-foreground">({r.userRatingsTotal})</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>
                    <div className="flex flex-wrap gap-x-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate max-w-[180px]">{r.address}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <Phone className="h-2.5 w-2.5" />
                        {r.phone}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-blue-600">
                        <Mail className="h-2.5 w-2.5" />
                        <span className="truncate max-w-[140px]">{r.email}</span>
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <X
                      className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1"
                      onClick={(e) => { e.stopPropagation(); toggle(r.placeId); }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t bg-muted/20">
            <button
              onClick={() => setPhase("setup")}
              disabled={selected.size === 0}
              className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Next: Set up campaign with {selected.size} contact{selected.size !== 1 ? "s" : ""} →
            </button>
          </div>
        </>
      )}

      {results.length === 0 && !isSearching && (
        <div className="py-10 text-center text-xs text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-20" />
          Search for businesses you want to reach
        </div>
      )}
    </div>
  );
}
