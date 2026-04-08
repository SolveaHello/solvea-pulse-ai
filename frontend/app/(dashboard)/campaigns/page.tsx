"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock3, MessageSquareText, RefreshCcw } from "lucide-react";

type SessionItem = {
  session_id: string;
  created_at: string;
  updated_at: string;
  summary: string;
};

function formatDate(dateText: string): string {
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) {
    return dateText;
  }
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CampaignsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSessions() {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/solveakit/sessions", {
        method: "GET",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.details || data?.error || "加载会话失败");
      }

      const data = (await res.json()) as { sessions?: SessionItem[] };
      const list = Array.isArray(data.sessions) ? data.sessions : [];
      setSessions(list);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载会话失败");
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  const empty = useMemo(() => !isLoading && sessions.length === 0, [isLoading, sessions.length]);

  return (
    <div className="min-h-full bg-gradient-to-br from-amber-50 via-white to-cyan-50 p-4 md:p-8">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-amber-100 bg-white/85 p-5 shadow-xl backdrop-blur-sm md:p-7">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Session 列表</h1>
            <p className="mt-1 text-sm text-slate-500">点击任意会话可跳转到对应 AI Chat 并继续对话</p>
          </div>

          <button
            type="button"
            onClick={() => void loadSessions()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            刷新
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            正在加载会话...
          </div>
        ) : null}

        {empty ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center text-sm text-slate-500">
            暂无会话数据
          </div>
        ) : null}

        {!isLoading && sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.session_id}
                href={`/?session_id=${encodeURIComponent(session.session_id)}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-cyan-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {session.summary || "(无摘要)"}
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs text-cyan-700">
                    <MessageSquareText className="h-3.5 w-3.5" />
                    继续对话
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="font-mono text-[11px] text-slate-600">{session.session_id}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    创建: {formatDate(session.created_at)}
                  </span>
                  <span>更新: {formatDate(session.updated_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
