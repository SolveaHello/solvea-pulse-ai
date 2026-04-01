"""
Server-Sent Events manager.
Maintains per-campaign queues for real-time call status broadcasting.
"""

import asyncio
import json
from collections import defaultdict
from typing import AsyncGenerator


class SSEManager:
    def __init__(self):
        # campaign_id -> list of asyncio.Queue
        self._queues: dict[str, list[asyncio.Queue]] = defaultdict(list)

    def subscribe(self, campaign_id: str) -> asyncio.Queue:
        """Create and register a queue for a campaign."""
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._queues[campaign_id].append(q)
        return q

    def unsubscribe(self, campaign_id: str, q: asyncio.Queue) -> None:
        try:
            self._queues[campaign_id].remove(q)
        except ValueError:
            pass
        if not self._queues[campaign_id]:
            del self._queues[campaign_id]

    async def publish(self, campaign_id: str, event: dict) -> None:
        """Broadcast an event to all subscribers of a campaign."""
        dead = []
        for q in list(self._queues.get(campaign_id, [])):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self.unsubscribe(campaign_id, q)

    async def event_stream(
        self, campaign_id: str, timeout: float = 300.0
    ) -> AsyncGenerator[str, None]:
        """
        Async generator yielding SSE-formatted data strings.
        Yields a heartbeat every 15s to keep the connection alive.
        """
        q = self.subscribe(campaign_id)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Send heartbeat comment to keep connection alive
                    yield ": heartbeat\n\n"
        finally:
            self.unsubscribe(campaign_id, q)


# Singleton
sse_manager = SSEManager()
