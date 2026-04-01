"use client";

import { useEffect, useRef, useState } from "react";
import type { CallStatusEvent, CampaignStats } from "@/lib/types";

interface UseCallStatusOptions {
  campaignId: string;
  enabled?: boolean;
  onEvent?: (event: CallStatusEvent) => void;
}

export function useCallStatus({
  campaignId,
  enabled = true,
  onEvent,
}: UseCallStatusOptions) {
  const [events, setEvents] = useState<CallStatusEvent[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || !campaignId) return;

    const es = new EventSource(`/api/campaigns/${campaignId}/status`);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "stats") {
          setStats(data.stats);
        } else {
          const event = data as CallStatusEvent;
          setEvents((prev) => [event, ...prev].slice(0, 200));
          onEvent?.(event);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [campaignId, enabled]);

  return { events, stats, connected };
}
