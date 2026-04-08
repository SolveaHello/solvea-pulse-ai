"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Bot, User, CheckCircle } from "lucide-react";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";
import { MapSearchCard } from "@/components/campaign/cards/MapSearchCard";
import { OutboundNumberCard } from "@/components/campaign/cards/OutboundNumberCard";
import type { MapConfirmData } from "@/components/campaign/cards/MapSearchCard";
import type { CampaignExtraction, PlaceResult } from "@/lib/types";

// ── Message types ─────────────────────────────────────────────────────────────
type TextMessage = { kind: "text"; role: "user" | "assistant"; content: string };
type CardMessage = {
  kind: "card";
  cardType: "map-search" | "outbound-number";
  confirmed: boolean;
  confirmedContacts?: PlaceResult[];
  confirmedPhone?: string;
  confirmedData?: MapConfirmData;
};
type ExtractionMessage = { kind: "extraction"; data: CampaignExtraction };

type ChatMessage = TextMessage | CardMessage | ExtractionMessage;

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MessageContent({ content }: { content: string }) {
  const lines = content
    .replace(/<show_card>[\w-]+<\/show_card>/g, "")
    .replace(/<campaign_data>[\s\S]*?<\/campaign_data>/g, "")
    .trim()
    .split("\n");

  const elements: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) { elements.push(<div key={i} className="h-1" />); continue; }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex gap-2 leading-snug">
          <span className="flex-shrink-0 font-medium">{numMatch[1]}.</span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      elements.push(
        <div key={i} className="flex gap-2 leading-snug">
          <span className="flex-shrink-0">•</span>
          <span>{renderInline(bulletMatch[1])}</span>
        </div>
      );
      continue;
    }
    elements.push(<p key={i} className="leading-snug">{renderInline(trimmed)}</p>);
  }
  return <div className="space-y-1">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ChatSetupInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      kind: "text",
      role: "assistant",
      content: "Hi! What's the goal of your campaign?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { setStep, setExtraction: storeExtraction, setSelectedContacts, setOutboundPhone, setCampaignGoal } =
    useCampaignSetupStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build the messages array to send to the API (text messages only)
  function buildApiMessages() {
    return messages
      .filter((m): m is TextMessage => m.kind === "text")
      .map((m) => ({ role: m.role, content: m.content }));
  }

  async function sendMessage() {
    if (!input.trim() || isLoading) return;
    const userText = input.trim();
    setInput("");

    const userMsg: TextMessage = { kind: "text", role: "user", content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const apiMessages = [...buildApiMessages(), { role: "user", content: userText }];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (!res.ok || !res.body) throw new Error("Chat request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let streamBuffer = "";

      // Add placeholder assistant message
      const assistantIdx = await new Promise<number>((resolve) => {
        setMessages((prev) => {
          resolve(prev.length);
          return [...prev, { kind: "text", role: "assistant", content: "" } as TextMessage];
        });
      });

      const applyAssistantContent = (nextContent: string) => {
        setMessages((prev) => {
          const updated = [...prev];
          const msg = updated[assistantIdx];
          if (msg?.kind === "text") {
            updated[assistantIdx] = { ...msg, content: nextContent };
          }
          return updated;
        });
      };

      const processLine = (line: string) => {
        if (line.startsWith("0:")) {
          try {
            const text = JSON.parse(line.slice(2));
            if (typeof text === "string" && text.length > 0) {
              assistantContent += text;
              applyAssistantContent(assistantContent);
            }
          } catch {
            // ignore malformed token line
          }
          return;
        }

        if (!line.startsWith("8:")) {
          return;
        }

        try {
          const data = JSON.parse(line.slice(2));

          if (data.showCard) {
            const cardType = data.showCard.type as CardMessage["cardType"];
            setMessages((prev) => {
              // Guard: never insert a duplicate card of the same type
              const alreadyExists = prev.some(
                (m) => m.kind === "card" && m.cardType === cardType
              );
              if (alreadyExists) return prev;
              return [...prev, { kind: "card", cardType, confirmed: false }];
            });
          }

          if (data.campaignExtraction) {
            setMessages((prev) => [
              ...prev,
              { kind: "extraction", data: data.campaignExtraction },
            ]);
          }
        } catch {
          // ignore malformed metadata line
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n");
        streamBuffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          processLine(line);
        }
      }

      streamBuffer += decoder.decode();
      if (streamBuffer.trim()) {
        processLine(streamBuffer.trim());
      }

      if (!assistantContent.trim()) {
        applyAssistantContent("我收到了你的消息。请再补充一点目标或受众信息，我就能继续帮你配置。");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { kind: "text", role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleMapConfirm(data: MapConfirmData, cardIdx: number) {
    setSelectedContacts(data.contacts);
    setOutboundPhone(data.outboundPhone);
    setCampaignGoal(data.objective);
    setMessages((prev) => {
      const updated = [...prev];
      const card = updated[cardIdx];
      if (card?.kind === "card") {
        updated[cardIdx] = {
          ...card,
          confirmed: true,
          confirmedContacts: data.contacts,
          confirmedData: data,
        };
      }
      const scheduleLabel = data.scheduleAt
        ? `scheduled for ${new Date(data.scheduleAt).toLocaleString()}`
        : "calling immediately";
      updated.push({
        kind: "text",
        role: "assistant",
        content: `Got it — ${data.contacts.length} contact${data.contacts.length !== 1 ? "s" : ""} added, outbound number set to ${data.outboundPhone}, ${scheduleLabel}. Your campaign is ready — want me to generate the AI calling script now?`,
      });
      return updated;
    });
  }

  function handlePhoneConfirm(phone: string, cardIdx: number) {
    setOutboundPhone(phone);
    setMessages((prev) => {
      const updated = [...prev];
      const card = updated[cardIdx];
      if (card?.kind === "card") {
        updated[cardIdx] = { ...card, confirmed: true, confirmedPhone: phone };
      }
      updated.push({
        kind: "text",
        role: "assistant",
        content: `Outbound number set to ${phone}. Your campaign is ready — want me to generate the AI calling script now?`,
      });
      return updated;
    });
  }

  function confirmExtraction(data: CampaignExtraction) {
    storeExtraction(data);
    setStep("review");
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg, i) => {
          // ── text bubble ──
          if (msg.kind === "text") {
            const cleanText = msg.content
              .replace(/<show_card>[\w-]+<\/show_card>/g, "")
              .replace(/<campaign_data>[\s\S]*?<\/campaign_data>/g, "")
              .trim();
            if (!cleanText) return null;

            return (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className="flex-shrink-0">
                  {msg.role === "assistant" ? (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <MessageContent content={msg.content} />
                </div>
              </div>
            );
          }

          // ── card ──
          if (msg.kind === "card") {
            return (
              <div key={i} className="pl-11">
                {msg.cardType === "map-search" && (
                  <MapSearchCard
                    confirmed={msg.confirmed}
                    confirmedData={msg.confirmedData}
                    onConfirm={(data) => handleMapConfirm(data, i)}
                  />
                )}
                {msg.cardType === "outbound-number" && (
                  <OutboundNumberCard
                    confirmed={msg.confirmed}
                    confirmedPhone={msg.confirmedPhone}
                    onConfirm={(phone) => handlePhoneConfirm(phone, i)}
                  />
                )}
              </div>
            );
          }

          // ── extraction preview ──
          if (msg.kind === "extraction") {
            return (
              <div key={i} className="pl-11">
                <div className="border border-green-200 bg-green-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Campaign ready</span>
                  </div>
                  <dl className="space-y-1.5 text-sm mb-4">
                    <Row label="Name" value={msg.data.name} />
                    <Row label="Objective" value={msg.data.objective} />
                    <Row label="Audience" value={msg.data.targetAudience} />
                    <Row label="Tone" value={msg.data.tone} />
                  </dl>
                  <button
                    onClick={() => confirmExtraction(msg.data)}
                    className="w-full bg-green-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Looks good — launch setup
                  </button>
                </div>
              </div>
            );
          }

          return null;
        })}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm text-muted-foreground">
              Thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Tell me about your campaign…"
            className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}
