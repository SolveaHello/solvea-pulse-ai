import { GenerateReportButton } from "@/components/reports/GenerateReportButton";

const MOCK_CAMPAIGNS = [
  { id: "camp-1", name: "NYC Nail Salons Q1" },
  { id: "camp-2", name: "Beauty Lounges Brooklyn" },
  { id: "camp-3", name: "Auto Services NYC" },
];

const MOCK_REPORTS = [
  {
    id: "report-1",
    reportDate: "2026-03-31T00:00:00Z",
    campaign: { name: "NYC Nail Salons Q1" },
    totalCalls: 48,
    connectedCalls: 31,
    interestedCount: 9,
    notInterestedCount: 14,
    voicemailCount: 8,
    noAnswerCount: 10,
    callbackCount: 3,
    confirmedCount: 2,
    convertedCount: 1,
    followUpsSent: 12,
    costCents: 2340,
    connectionRate: 64.6,
    interestRate: 29.0,
    insights: [
      "Best connection window was 10am–12pm (73% pickup rate vs. 48% afternoon).",
      "Businesses with Google rating ≥ 4.5 showed 2× higher interest rate.",
      "SMS follow-ups sent within 30 min of call had 40% higher reply rate.",
      "Voicemail disposition led to 3 inbound callback requests — higher than expected.",
    ],
    recommendations: [
      "Shift 60% of calls to the 10am–12pm window tomorrow.",
      "Filter next batch to Google rating ≥ 4.3 to improve interest rate.",
      "Automate SMS immediately after voicemail disposition (currently 2-hr delay).",
      "A/B test a shorter opening script — current avg call is 3.2 min, try 90-sec version.",
    ],
  },
  {
    id: "report-2",
    reportDate: "2026-03-30T00:00:00Z",
    campaign: { name: "Beauty Lounges Brooklyn" },
    totalCalls: 35,
    connectedCalls: 19,
    interestedCount: 6,
    notInterestedCount: 9,
    voicemailCount: 7,
    noAnswerCount: 9,
    callbackCount: 2,
    confirmedCount: 1,
    convertedCount: 0,
    followUpsSent: 8,
    costCents: 1680,
    connectionRate: 54.3,
    interestRate: 31.6,
    insights: [
      "Beauty lounges showed higher engagement compared to nail salons (31.6% vs 22% baseline).",
      "Contacted businesses that had recently opened (< 2 years) responded 50% more positively.",
      "Email follow-ups had 28% open rate — above industry average of 21%.",
    ],
    recommendations: [
      "Prioritize recently-opened businesses (< 2 years) in next scrape.",
      "Personalize email subject line with business name for higher open rate.",
      "Follow up with the 2 callback-requested leads before 5pm today.",
    ],
  },
  {
    id: "report-3",
    reportDate: "2026-03-29T00:00:00Z",
    campaign: null,
    totalCalls: 83,
    connectedCalls: 50,
    interestedCount: 15,
    notInterestedCount: 23,
    voicemailCount: 15,
    noAnswerCount: 18,
    callbackCount: 5,
    confirmedCount: 3,
    convertedCount: 1,
    followUpsSent: 20,
    costCents: 4020,
    connectionRate: 60.2,
    interestRate: 30.0,
    insights: [
      "Week-over-week improvement: connection rate up 6% from 54% to 60%.",
      "Auto services vertical outperformed beauty (38% vs 28% interest rate).",
      "Total campaign cost: $40.20 — cost per confirmed lead: $13.40.",
    ],
    recommendations: [
      "Allocate 40% more budget to Auto Services vertical next week.",
      "Test bilingual (English/Spanish) script for NYC neighborhoods with high Hispanic population.",
      "Review and update script based on top objections: 'too busy', 'already have a solution'.",
    ],
  },
];

export default function ReportsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Daily Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-generated performance analysis and recommendations
          </p>
        </div>
        <GenerateReportButton userId="local-demo-user" campaigns={MOCK_CAMPAIGNS} />
      </div>

      <div className="space-y-4">
        {MOCK_REPORTS.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}

function ReportCard({ report }: { report: any }) {
  const date = new Date(report.reportDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const costDollars = (report.costCents / 100).toFixed(2);

  // Funnel bar data
  const funnel = [
    { label: "No Answer", value: report.noAnswerCount, color: "bg-gray-300" },
    { label: "Voicemail", value: report.voicemailCount, color: "bg-slate-400" },
    { label: "Not Interested", value: report.notInterestedCount, color: "bg-red-300" },
    { label: "Callback", value: report.callbackCount, color: "bg-blue-400" },
    { label: "Interested", value: report.interestedCount, color: "bg-orange-400" },
    { label: "Confirmed", value: report.confirmedCount, color: "bg-indigo-500" },
    { label: "Converted", value: report.convertedCount, color: "bg-emerald-500" },
  ];

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b">
        <div>
          <p className="font-semibold text-sm">{date}</p>
          <p className="text-xs text-muted-foreground">
            {report.campaign ? report.campaign.name : "All Campaigns"}
          </p>
        </div>
        <div className="flex items-center gap-5">
          <Metric label="Calls" value={report.totalCalls} />
          <Metric label="Connected" value={`${report.connectionRate}%`} />
          <Metric label="Interest Rate" value={`${report.interestRate}%`} />
          <Metric label="Follow-ups" value={report.followUpsSent} />
          <Metric label="Confirmed" value={report.confirmedCount} highlight />
          <Metric label="Converted" value={report.convertedCount} highlight />
          <Metric label="Cost" value={`$${costDollars}`} />
        </div>
      </div>

      {/* Disposition funnel bar */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Call Outcomes
        </p>
        <div className="flex h-5 rounded overflow-hidden gap-px">
          {funnel.map((f) =>
            f.value > 0 ? (
              <div
                key={f.label}
                className={`${f.color} transition-all`}
                style={{ width: `${(f.value / report.totalCalls) * 100}%` }}
                title={`${f.label}: ${f.value}`}
              />
            ) : null
          )}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {funnel.map((f) =>
            f.value > 0 ? (
              <span key={f.label} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className={`inline-block w-2.5 h-2.5 rounded-sm ${f.color}`} />
                {f.label} ({f.value})
              </span>
            ) : null
          )}
        </div>
      </div>

      {/* Insights + Recommendations */}
      {(report.insights?.length > 0 || report.recommendations?.length > 0) && (
        <div className="px-5 py-4 grid grid-cols-2 gap-6 border-t">
          {report.insights?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                AI Insights
              </p>
              <ul className="space-y-1.5">
                {report.insights.map((insight: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.recommendations?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Recommendations for Tomorrow
              </p>
              <ul className="space-y-1.5">
                {report.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-emerald-500 mt-0.5 shrink-0">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <div className={`text-base font-bold ${highlight ? "text-primary" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
