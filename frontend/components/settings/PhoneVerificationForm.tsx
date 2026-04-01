"use client";

import { useState } from "react";
import { phoneVerifyApi } from "@/lib/api-client";

interface PhoneVerificationFormProps {
  currentPhone: string | null;
}

export function PhoneVerificationForm({ currentPhone }: PhoneVerificationFormProps) {
  const [phone, setPhone] = useState(currentPhone ?? "");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"input" | "verify">("input");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await phoneVerifyApi.send(phone.trim());
      setStage("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await phoneVerifyApi.confirm(phone.trim(), code.trim());
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {stage === "input" ? (
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={sendCode}
            disabled={loading || !phone.trim()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Code"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to {phone}
          </p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={confirmCode}
              disabled={loading || code.length < 6}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
            <button
              onClick={() => setStage("input")}
              className="px-3 py-2 border rounded-lg text-sm hover:bg-muted"
            >
              Back
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
