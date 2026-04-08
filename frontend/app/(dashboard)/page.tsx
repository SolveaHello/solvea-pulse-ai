"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Bot, Loader2, SendHorizonal, UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter, useSearchParams } from "next/navigation";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function extractAssistantText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as {
    message?: { content?: Array<{ type?: string; text?: string }> };
    text?: string;
    delta?: string;
  };

  if (typeof data.delta === "string" && data.delta) {
    return data.delta;
  }

  if (typeof data.text === "string" && data.text) {
    return data.text;
  }

  if (!Array.isArray(data.message?.content)) {
    return null;
  }

  const text = data.message.content
    .filter((item) => item?.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();

  return text || null;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySessionId = searchParams.get("session_id");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(querySessionId);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  function scrollToBottom() {
    const node = listRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }

  function applySessionId(nextSessionId: string | null | undefined) {
    if (!nextSessionId || nextSessionId === sessionId) {
      return;
    }

    setSessionId(nextSessionId);

    const params = new URLSearchParams(window.location.search);
    params.set("session_id", nextSessionId);
    const nextUrl = `/?${params.toString()}`;
    router.replace(nextUrl, { scroll: false });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || isStreaming) {
      return;
    }

    setError(null);
    setInput("");

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
    };

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setIsStreaming(true);

    setTimeout(scrollToBottom, 0);

    try {
      const res = await fetch("/api/solveakit/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, session_id: sessionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.details || data?.error || "Request failed, please retry."
        );
      }

      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("text/event-stream")) {
        const data = await res.json();
        const text = extractAssistantText(data) || "";

        applySessionId(data?.session_id);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: text } : m))
        );
        return;
      }

      if (!res.body) {
        throw new Error("No stream body returned.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) {
            continue;
          }

          const rawData = trimmed.slice(5).trim();
          if (!rawData || rawData === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(rawData) as {
              session_id?: string;
            };
            if (typeof parsed.session_id === "string") {
              applySessionId(parsed.session_id);
            }

            const maybeText = extractAssistantText(parsed);
            if (!maybeText) {
              continue;
            }

            // Some streams push token deltas, others push full message snapshots.
            accumulated =
              maybeText.length >= accumulated.length ? maybeText : accumulated + maybeText;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: accumulated } : m
              )
            );
          } catch {
            accumulated += rawData;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: accumulated } : m
              )
            );
          }
        }

        setTimeout(scrollToBottom, 0);
      }
    } catch (streamError) {
      const message =
        streamError instanceof Error
          ? streamError.message
          : "Streaming failed. Please retry.";
      setError(message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  m.content || "抱歉，回复过程中出现错误。请稍后重试。",
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      setTimeout(scrollToBottom, 0);
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4 md:p-8">
      <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-cyan-100 bg-white/80 shadow-xl backdrop-blur-sm">
        <header className="border-b border-cyan-100 bg-white/70 px-4 py-4 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">
                AI Chat
              </h1>
              <p className="mt-1 text-xs text-slate-500 md:text-sm">
                支持流式回复（SSE）与会话续聊
              </p>
            </div>
            <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-700">
              {sessionId ? `session: ${sessionId.slice(0, 8)}...` : "new session"}
            </div>
          </div>
        </header>

        <div
          ref={listRef}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6"
        >
          {!hasMessages ? (
            <div className="mx-auto mt-10 max-w-xl rounded-xl border border-dashed border-cyan-200 bg-cyan-50/40 p-6 text-center">
              <p className="text-sm text-slate-600">
                输入你的问题开始对话。首次消息会创建会话，后续消息自动走 resume 接口。
              </p>
            </div>
          ) : null}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-[90%] items-start gap-3 rounded-2xl px-4 py-3 md:max-w-[80%] ${
                  m.role === "user"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-800"
                }`}
              >
                <span
                  className={`mt-0.5 ${
                    m.role === "user" ? "text-slate-200" : "text-cyan-600"
                  }`}
                >
                  {m.role === "user" ? (
                    <UserRound className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </span>
                {m.role === "assistant" ? (
                  <div className="chat-markdown text-sm leading-6 [&_a]:text-cyan-700 [&_a]:underline [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-slate-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p:not(:first-child)]:mt-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-6">{m.content}</p>
                )}
              </div>
            </div>
          ))}

          {isStreaming ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                AI 正在思考...
              </div>
            </div>
          ) : null}
        </div>

        <footer className="border-t border-cyan-100 bg-white/90 p-4 md:p-5">
          {error ? (
            <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="flex items-center gap-2 md:gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你的问题..."
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none ring-cyan-400 transition focus:ring-2"
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
            >
              <SendHorizonal className="h-4 w-4" />
              发送
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}
