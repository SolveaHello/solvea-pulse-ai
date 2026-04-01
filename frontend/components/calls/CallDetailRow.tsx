"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Phone, Clock } from "lucide-react";
import { TranscriptViewer } from "./TranscriptViewer";
import { CallSummaryCard } from "./CallSummaryCard";
import type { Call } from "@/lib/types";

interface CallDetailRowProps {
  call: Call & {
    contact?: { name?: string | null; businessName?: string | null; phone: string } | null;
    recording?: { s3Url?: string | null; vapiUrl?: string | null } | null;
    transcript?: {
      rawText: string;
      translatedText?: string | null;
      language?: string | null;
      messages: unknown[];
    } | null;
    summary?: {
      summary: string;
      keyPoints: unknown[];
      sentiment?: string | null;
      nextAction?: string | null;
      extractedData?: unknown;
    } | null;
    appointment?: {
      title: string;
      startTime: string;
      endTime: string;
      meetingLink?: string | null;
    } | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  QUEUED: "bg-gray-100 text-gray-700",
  RINGING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700 animate-pulse",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  BUSY: "bg-orange-100 text-orange-700",
  NO_ANSWER: "bg-gray-100 text-gray-600",
};

export function CallDetailRow({ call }: CallDetailRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "transcript" | "recording">("summary");

  const contactLabel =
    call.contact?.name ||
    call.contact?.businessName ||
    call.contact?.phone ||
    "Unknown";

  const duration = call.duration
    ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
    : call.status === "COMPLETED" ? "< 1m" : "—";

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="grid grid-cols-[1fr_120px_100px_100px_auto] gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">{contactLabel}</span>
          {call.contact?.phone && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {call.contact.phone}
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs self-center ${
            STATUS_COLORS[call.status] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {call.status.replace("_", " ")}
        </span>
        <div className="flex items-center gap-1 text-sm text-muted-foreground self-center">
          <Clock className="h-3.5 w-3.5" />
          {duration}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs self-center ${
            call.disposition === "INTERESTED"
              ? "bg-green-100 text-green-700"
              : call.disposition === "NOT_INTERESTED"
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {call.disposition?.replace("_", " ") ?? "PENDING"}
        </span>
        <button className="flex items-center text-muted-foreground self-center">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t">
          {/* Sub-tabs */}
          <div className="flex border-b px-4">
            {(["summary", "transcript", "recording"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === "summary" && call.summary ? (
              <CallSummaryCard
                summary={call.summary as Parameters<typeof CallSummaryCard>[0]["summary"]}
                disposition={call.disposition as Parameters<typeof CallSummaryCard>[0]["disposition"]}
                appointment={call.appointment}
              />
            ) : activeTab === "summary" ? (
              <p className="text-sm text-muted-foreground">No summary available yet.</p>
            ) : null}

            {activeTab === "transcript" && call.transcript ? (
              <TranscriptViewer
                transcript={call.transcript as Parameters<typeof TranscriptViewer>[0]["transcript"]}
              />
            ) : activeTab === "transcript" ? (
              <p className="text-sm text-muted-foreground">No transcript available yet.</p>
            ) : null}

            {activeTab === "recording" && (
              <RecordingPlayer
                url={call.recording?.s3Url || call.recording?.vapiUrl || null}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RecordingPlayer({ url }: { url: string | null }) {
  if (!url) {
    return <p className="text-sm text-muted-foreground">No recording available.</p>;
  }
  return (
    <div>
      <p className="text-sm font-medium mb-2">Call Recording</p>
      <audio controls src={url} className="w-full">
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}
