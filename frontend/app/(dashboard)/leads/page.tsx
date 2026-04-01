import { LeadsTable } from "@/components/leads/LeadsTable";

const MOCK_CAMPAIGNS = [
  { id: "camp-1", name: "NYC Nail Salons Q1" },
  { id: "camp-2", name: "Beauty Lounges Brooklyn" },
  { id: "camp-3", name: "Auto Services NYC" },
];

const MOCK_LEADS = [
  {
    id: "lead-1",
    name: "Sarah Johnson",
    businessName: "Nail Studio NYC",
    phone: "+1 212-555-0101",
    email: "sarah@nailstudio.com",
    address: "123 5th Ave, New York, NY",
    website: "nailstudio.com",
    disposition: "INTERESTED",
    assignedTo: undefined,
    confirmedAt: undefined,
    convertedAt: undefined,
    createdAt: "2026-03-28T10:00:00Z",
    calls: [
      {
        id: "call-1",
        duration: 187,
        endedAt: "2026-03-28T10:03:07Z",
        summary: {
          summary:
            "Sarah expressed strong interest in AI-powered customer outreach tools. She currently manages 3 staff and spends ~4 hrs/week on follow-up calls. Excited about the demo.",
          sentiment: "positive",
          keyPoints: [
            "Currently using manual follow-up process",
            "Has 3 staff, ~200 customers/month",
            "Budget: $200-500/mo for tools",
            "Prefers email + SMS combo",
          ],
          nextAction: "Send demo link + pricing deck",
        },
      },
    ],
    followUps: [
      { id: "fu-1", channel: "EMAIL", status: "SENT", sentAt: "2026-03-28T11:00:00Z" },
    ],
    contactList: { campaign: { id: "camp-1", name: "NYC Nail Salons Q1" } },
  },
  {
    id: "lead-2",
    name: "Marcus Chen",
    businessName: "Chen's Barbershop",
    phone: "+1 718-555-0202",
    email: "marcus@chensbarbershop.com",
    address: "88 Queens Blvd, Queens, NY",
    website: undefined,
    disposition: "CALLBACK_REQUESTED",
    assignedTo: undefined,
    confirmedAt: undefined,
    convertedAt: undefined,
    createdAt: "2026-03-29T14:00:00Z",
    calls: [
      {
        id: "call-2",
        duration: 94,
        endedAt: "2026-03-29T14:01:34Z",
        summary: {
          summary:
            "Marcus was in the middle of a haircut, asked us to call back Thursday afternoon. Seemed receptive to the idea of automated reminders for appointments.",
          sentiment: "neutral",
          keyPoints: [
            "Callback requested: Thursday 2–5pm",
            "Pain point: no-shows cost ~$800/month",
            "Currently uses manual text reminders",
          ],
          nextAction: "Call back Thursday between 2–5pm EST",
        },
      },
    ],
    followUps: [],
    contactList: { campaign: { id: "camp-1", name: "NYC Nail Salons Q1" } },
  },
  {
    id: "lead-3",
    name: "Lisa Patel",
    businessName: "Glow Beauty Lounge",
    phone: "+1 646-555-0303",
    email: "lisa@glowbeauty.com",
    address: "45 W 34th St, New York, NY",
    website: "glowbeautylounge.com",
    disposition: "CONFIRMED",
    assignedTo: "sales-rep-1",
    confirmedAt: "2026-03-30T09:00:00Z",
    convertedAt: undefined,
    createdAt: "2026-03-27T16:00:00Z",
    calls: [
      {
        id: "call-3",
        duration: 312,
        endedAt: "2026-03-27T16:05:12Z",
        summary: {
          summary:
            "Lisa runs a 6-station beauty lounge with a dedicated booking system. She confirmed interest and agreed to a 30-min Zoom demo with the sales team next Tuesday.",
          sentiment: "positive",
          keyPoints: [
            "6 stations, 400+ customers/month",
            "Already using Square for bookings",
            "Wants AI to handle re-engagement campaigns",
            "Demo scheduled: Tuesday 10am",
          ],
          nextAction: "Sales rep to send Zoom invite",
        },
      },
    ],
    followUps: [
      { id: "fu-2", channel: "EMAIL", status: "SENT", sentAt: "2026-03-27T17:00:00Z" },
      { id: "fu-3", channel: "SMS", status: "SENT", sentAt: "2026-03-29T10:00:00Z" },
    ],
    contactList: { campaign: { id: "camp-2", name: "Beauty Lounges Brooklyn" } },
  },
  {
    id: "lead-4",
    name: "David Kim",
    businessName: "Kim's Auto Detail",
    phone: "+1 917-555-0404",
    email: "david@kimsautodetail.com",
    address: "200 Atlantic Ave, Brooklyn, NY",
    website: "kimsautodetail.com",
    disposition: "CONVERTED",
    assignedTo: "sales-rep-2",
    confirmedAt: "2026-03-25T11:00:00Z",
    convertedAt: "2026-03-30T15:00:00Z",
    createdAt: "2026-03-24T12:00:00Z",
    calls: [
      {
        id: "call-4",
        duration: 425,
        endedAt: "2026-03-24T12:07:05Z",
        summary: {
          summary:
            "David runs a high-volume auto detailing shop. He was immediately interested and asked detailed questions about pricing and integrations. Signed up same day after the demo.",
          sentiment: "positive",
          keyPoints: [
            "High urgency — loses ~$1,200/mo to no-shows",
            "Has existing CRM (HubSpot)",
            "Wants API integration",
            "Signed up on Starter plan",
          ],
          nextAction: "Onboarding call scheduled",
        },
      },
    ],
    followUps: [
      { id: "fu-4", channel: "EMAIL", status: "REPLIED", sentAt: "2026-03-24T13:00:00Z" },
    ],
    contactList: { campaign: { id: "camp-3", name: "Auto Services NYC" } },
  },
  {
    id: "lead-5",
    name: "Amanda Torres",
    businessName: "Lotus Wellness Spa",
    phone: "+1 212-555-0505",
    email: "amanda@lotuswellness.com",
    address: "310 Lexington Ave, New York, NY",
    website: "lotuswellnessspa.com",
    disposition: "INTERESTED",
    assignedTo: undefined,
    confirmedAt: undefined,
    convertedAt: undefined,
    createdAt: "2026-03-31T09:00:00Z",
    calls: [
      {
        id: "call-5",
        duration: 210,
        endedAt: "2026-03-31T09:03:30Z",
        summary: {
          summary:
            "Amanda manages a wellness spa with 8 therapists. She's been burned by robocall services before but is open to seeing how AI is different. Wants to see a live demo before committing.",
          sentiment: "positive",
          keyPoints: [
            "8 therapists, premium clientele",
            "Previous bad experience with robocalls",
            "Wants to see live AI demo",
            "Decision maker, no approval needed",
          ],
          nextAction: "Schedule live demo this week",
        },
      },
    ],
    followUps: [],
    contactList: { campaign: { id: "camp-2", name: "Beauty Lounges Brooklyn" } },
  },
];

export default function LeadsPage({
  searchParams,
}: {
  searchParams: { disposition?: string };
}) {
  const dispositionFilter = searchParams.disposition
    ? [searchParams.disposition]
    : ["INTERESTED", "CALLBACK_REQUESTED", "CONFIRMED", "CONVERTED"];

  const leads = MOCK_LEADS.filter((l) => dispositionFilter.includes(l.disposition));

  const allCounts = MOCK_LEADS.reduce(
    (acc, l) => { acc[l.disposition] = (acc[l.disposition] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const stages = [
    { label: "Interested", key: "INTERESTED", color: "text-orange-600 bg-orange-50 border-orange-100" },
    { label: "Callback", key: "CALLBACK_REQUESTED", color: "text-blue-600 bg-blue-50 border-blue-100" },
    { label: "Confirmed", key: "CONFIRMED", color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
    { label: "Converted", key: "CONVERTED", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hot prospects ready for follow-up or sales hand-off
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { value: "", label: "All Hot Leads" },
            { value: "INTERESTED", label: "Interested" },
            { value: "CALLBACK_REQUESTED", label: "Callback" },
            { value: "CONFIRMED", label: "Confirmed" },
            { value: "CONVERTED", label: "Converted" },
          ].map((o) => (
            <a
              key={o.value}
              href={o.value ? `?disposition=${o.value}` : "/leads"}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                (searchParams.disposition || "") === o.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {o.label}
            </a>
          ))}
        </div>
      </div>

      {/* Funnel summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {stages.map((s) => (
          <a
            key={s.key}
            href={`?disposition=${s.key}`}
            className={`rounded-lg px-4 py-3 border cursor-pointer transition-opacity hover:opacity-80 ${s.color}`}
          >
            <div className="text-2xl font-bold">{allCounts[s.key] || 0}</div>
            <div className="text-xs font-medium mt-0.5">{s.label}</div>
          </a>
        ))}
      </div>

      <LeadsTable leads={leads as any} userId="local-demo-user" campaigns={MOCK_CAMPAIGNS} />
    </div>
  );
}
