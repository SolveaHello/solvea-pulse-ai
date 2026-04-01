"use client";

import { Calendar, ExternalLink } from "lucide-react";

interface GoogleCalendarConnectProps {
  connected: boolean;
}

export function GoogleCalendarConnect({ connected }: GoogleCalendarConnectProps) {
  function connect() {
    window.location.href = "/api/auth/google/calendar";
  }

  function disconnect() {
    fetch("/api/auth/google/disconnect", { method: "POST" }).then(() =>
      window.location.reload()
    );
  }

  return (
    <div>
      {connected ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-green-600">
            Google Calendar connected. AI will automatically book meetings during calls.
          </span>
          <button
            onClick={disconnect}
            className="text-xs text-muted-foreground hover:text-red-600 underline"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          className="flex items-center gap-2 border rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Connect Google Calendar
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
