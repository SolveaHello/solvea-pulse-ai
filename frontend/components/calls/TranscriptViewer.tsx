"use client";

import type { Transcript } from "@/lib/types";
import { Bot, User } from "lucide-react";

interface TranscriptViewerProps {
  transcript: Transcript;
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  return (
    <div className="space-y-4">
      {transcript.language && transcript.language !== "en" && transcript.translatedText && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <span className="font-medium text-blue-800">
            Translated from {transcript.language}
          </span>
        </div>
      )}

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {(transcript.messages as { role: string; content: string; timestamp?: string }[]).map(
          (msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "assistant" ? "flex-row" : "flex-row-reverse"}`}
            >
              <div className="flex-shrink-0">
                {msg.role === "assistant" ? (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "assistant"
                    ? "bg-muted"
                    : "bg-primary/10"
                }`}
              >
                <p>{msg.content}</p>
                {msg.timestamp && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {msg.timestamp}
                  </p>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {transcript.translatedText && transcript.language !== "en" && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Show original ({transcript.language})
          </summary>
          <p className="mt-2 text-muted-foreground whitespace-pre-wrap">
            {transcript.rawText}
          </p>
        </details>
      )}
    </div>
  );
}
