"use client";

import type { CallSummary, Disposition } from "@/lib/types";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  Calendar,
} from "lucide-react";

interface CallSummaryCardProps {
  summary: CallSummary;
  disposition: Disposition;
  appointment?: { meetingLink?: string; startTime: string; title: string } | null;
}

export function CallSummaryCard({
  summary,
  disposition,
  appointment,
}: CallSummaryCardProps) {
  return (
    <div className="space-y-4">
      {/* Sentiment + Disposition */}
      <div className="flex items-center gap-3">
        <SentimentBadge sentiment={summary.sentiment} />
        <DispositionBadge disposition={disposition} />
      </div>

      {/* Summary text */}
      <div>
        <h4 className="text-sm font-medium mb-1">Summary</h4>
        <p className="text-sm text-muted-foreground">{summary.summary}</p>
      </div>

      {/* Key points */}
      {summary.keyPoints.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-1">Key Points</h4>
          <ul className="space-y-1">
            {(summary.keyPoints as string[]).map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next action */}
      {summary.nextAction && (
        <div>
          <h4 className="text-sm font-medium mb-1">Next Action</h4>
          <p className="text-sm text-muted-foreground">{summary.nextAction}</p>
        </div>
      )}

      {/* Extracted contact data */}
      {summary.extractedData &&
        Object.keys(summary.extractedData as object).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1">Extracted Info</h4>
            <dl className="space-y-1">
              {Object.entries(summary.extractedData as Record<string, string>).map(
                ([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <dt className="text-muted-foreground capitalize">
                      {k.replace(/_/g, " ")}:
                    </dt>
                    <dd>{v}</dd>
                  </div>
                )
              )}
            </dl>
          </div>
        )}

      {/* Appointment info */}
      {appointment && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Meeting Booked
            </span>
          </div>
          <p className="text-sm text-green-700">{appointment.title}</p>
          <p className="text-xs text-green-600 mt-0.5">
            {new Date(appointment.startTime).toLocaleString()}
          </p>
          {appointment.meetingLink && (
            <a
              href={appointment.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 underline mt-1 block"
            >
              Join Google Meet
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment?: string | null }) {
  if (!sentiment) return null;
  const map = {
    positive: {
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      label: "Positive",
      cls: "bg-green-100 text-green-700",
    },
    negative: {
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      label: "Negative",
      cls: "bg-red-100 text-red-700",
    },
    neutral: {
      icon: <Minus className="h-3.5 w-3.5" />,
      label: "Neutral",
      cls: "bg-gray-100 text-gray-700",
    },
  };
  const s = map[sentiment as keyof typeof map];
  if (!s) return null;
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

function DispositionBadge({ disposition }: { disposition: Disposition }) {
  const map: Record<Disposition, { label: string; cls: string }> = {
    PENDING: { label: "Pending", cls: "bg-gray-100 text-gray-700" },
    CALLED: { label: "Called", cls: "bg-blue-100 text-blue-700" },
    INTERESTED: { label: "Interested", cls: "bg-green-100 text-green-700" },
    NOT_INTERESTED: { label: "Not Interested", cls: "bg-red-100 text-red-700" },
    VOICEMAIL: { label: "Voicemail", cls: "bg-yellow-100 text-yellow-700" },
    NO_ANSWER: { label: "No Answer", cls: "bg-orange-100 text-orange-700" },
    DNC: { label: "DNC", cls: "bg-red-100 text-red-800" },
    CALLBACK_REQUESTED: { label: "Callback", cls: "bg-purple-100 text-purple-700" },
    CONFIRMED: { label: "Confirmed", cls: "bg-indigo-100 text-indigo-700" },
    CONVERTED: { label: "Converted", cls: "bg-emerald-100 text-emerald-700" },
  };
  const d = map[disposition] ?? map.PENDING;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${d.cls}`}>
      {d.label}
    </span>
  );
}
