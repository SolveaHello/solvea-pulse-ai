import { Mail, MessageSquare, CheckCircle2, XCircle, Clock } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  SENT: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: Mail },
  REPLIED: { label: "Replied", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  FAILED: { label: "Failed", color: "bg-red-100 text-red-700", icon: XCircle },
  SKIPPED: { label: "Skipped", color: "bg-gray-100 text-gray-500", icon: XCircle },
};

const ALL_FOLLOWUPS = [
  {
    id: "fu-1",
    channel: "EMAIL",
    status: "SENT",
    subject: "Quick follow-up from our call today — AI outreach demo for Nail Studio NYC",
    sentAt: "2026-03-28T11:00:00Z",
    repliedAt: undefined,
    contact: { name: "Sarah Johnson", businessName: "Nail Studio NYC", email: "sarah@nailstudio.com", phone: "+1 212-555-0101" },
    campaign: { name: "NYC Nail Salons Q1" },
  },
  {
    id: "fu-2",
    channel: "EMAIL",
    status: "SENT",
    subject: "Your AI demo is confirmed — Glow Beauty Lounge",
    sentAt: "2026-03-27T17:00:00Z",
    repliedAt: undefined,
    contact: { name: "Lisa Patel", businessName: "Glow Beauty Lounge", email: "lisa@glowbeauty.com", phone: "+1 646-555-0303" },
    campaign: { name: "Beauty Lounges Brooklyn" },
  },
  {
    id: "fu-3",
    channel: "SMS",
    status: "SENT",
    subject: undefined,
    sentAt: "2026-03-29T10:00:00Z",
    repliedAt: undefined,
    contact: { name: "Lisa Patel", businessName: "Glow Beauty Lounge", email: "lisa@glowbeauty.com", phone: "+1 646-555-0303" },
    campaign: { name: "Beauty Lounges Brooklyn" },
  },
  {
    id: "fu-4",
    channel: "EMAIL",
    status: "REPLIED",
    subject: "Re: AI calling demo — Kim's Auto Detail",
    sentAt: "2026-03-24T13:00:00Z",
    repliedAt: "2026-03-24T15:42:00Z",
    contact: { name: "David Kim", businessName: "Kim's Auto Detail", email: "david@kimsautodetail.com", phone: "+1 917-555-0404" },
    campaign: { name: "Auto Services NYC" },
  },
  {
    id: "fu-5",
    channel: "SMS",
    status: "SENT",
    subject: undefined,
    sentAt: "2026-03-29T09:15:00Z",
    repliedAt: undefined,
    contact: { name: "Marcus Chen", businessName: "Chen's Barbershop", email: undefined, phone: "+1 718-555-0202" },
    campaign: { name: "NYC Nail Salons Q1" },
  },
  {
    id: "fu-6",
    channel: "EMAIL",
    status: "PENDING",
    subject: "Following up — Lotus Wellness Spa",
    sentAt: undefined,
    repliedAt: undefined,
    contact: { name: "Amanda Torres", businessName: "Lotus Wellness Spa", email: "amanda@lotuswellness.com", phone: "+1 212-555-0505" },
    campaign: { name: "Beauty Lounges Brooklyn" },
  },
  {
    id: "fu-7",
    channel: "EMAIL",
    status: "FAILED",
    subject: "Your AI demo awaits — Sunrise Nail Bar",
    sentAt: "2026-03-30T08:00:00Z",
    repliedAt: undefined,
    contact: { name: "Jenny Wu", businessName: "Sunrise Nail Bar", email: "jenny@sunrisenails.com", phone: "+1 212-555-0606" },
    campaign: { name: "NYC Nail Salons Q1" },
  },
  {
    id: "fu-8",
    channel: "SMS",
    status: "SKIPPED",
    subject: undefined,
    sentAt: undefined,
    repliedAt: undefined,
    contact: { name: "Robert Lee", businessName: "Lee's Barbershop", email: undefined, phone: "+1 718-555-0707" },
    campaign: { name: "NYC Nail Salons Q1" },
  },
];

export default function FollowUpsPage({
  searchParams,
}: {
  searchParams: { status?: string; channel?: string };
}) {
  const followUps = ALL_FOLLOWUPS.filter((f) => {
    if (searchParams.status && f.status !== searchParams.status) return false;
    if (searchParams.channel && f.channel !== searchParams.channel) return false;
    return true;
  });

  // Summary counts from ALL (not filtered) for header cards
  const counts = ALL_FOLLOWUPS.reduce(
    (acc, f) => { acc[f.status] = (acc[f.status] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Follow-ups</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automated email & SMS messages sent after calls
        </p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const Icon = cfg.icon;
          return (
            <a
              key={status}
              href={status !== (searchParams.status || "") ? `?status=${status}` : "/followups"}
              className={`rounded-lg px-4 py-3 border transition-colors ${
                searchParams.status === status ? "border-primary" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
              <div className="text-2xl font-bold">{counts[status] || 0}</div>
            </a>
          );
        })}
      </div>

      {/* Channel filter */}
      <div className="flex gap-2 mb-4">
        {[
          { value: "", label: "All" },
          { value: "EMAIL", label: "Email" },
          { value: "SMS", label: "SMS" },
        ].map((opt) => (
          <a
            key={opt.value}
            href={
              opt.value
                ? `?${searchParams.status ? `status=${searchParams.status}&` : ""}channel=${opt.value}`
                : searchParams.status
                ? `?status=${searchParams.status}`
                : "/followups"
            }
            className={`text-xs px-3 py-1.5 rounded-full border ${
              (searchParams.channel || "") === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {opt.label}
          </a>
        ))}
      </div>

      {followUps.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            No follow-ups yet. They are sent automatically after calls.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_120px_100px_120px] gap-4 px-4 py-2 text-xs text-muted-foreground uppercase tracking-wide border-b">
            <span>Ch</span>
            <span>Contact / Campaign</span>
            <span>Status</span>
            <span>Sent</span>
            <span>Replied</span>
          </div>
          {followUps.map((fu) => {
            const cfg = STATUS_CONFIG[fu.status];
            const Icon = fu.channel === "EMAIL" ? Mail : MessageSquare;
            const contactLabel =
              fu.contact.businessName || fu.contact.name || fu.contact.email || fu.contact.phone;
            return (
              <div
                key={fu.id}
                className="grid grid-cols-[auto_1fr_120px_100px_120px] gap-4 px-4 py-3 border-b last:border-0 items-center hover:bg-accent/30 rounded transition-colors"
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{contactLabel}</p>
                  <p className="text-xs text-muted-foreground truncate">{fu.campaign.name}</p>
                  {fu.subject && (
                    <p className="text-xs text-muted-foreground truncate italic">
                      {fu.subject}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${cfg.color}`}
                >
                  {cfg.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {fu.sentAt
                    ? new Date(fu.sentAt).toLocaleDateString()
                    : "—"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {fu.repliedAt
                    ? new Date(fu.repliedAt).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
