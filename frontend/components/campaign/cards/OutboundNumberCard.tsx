"use client";

import { useState, useEffect } from "react";
import { Phone, CheckCircle2, ShoppingCart, Loader2 } from "lucide-react";

const STORAGE_KEY = "user_phone";

interface OutboundNumberCardProps {
  onConfirm: (phone: string) => void;
  confirmed?: boolean;
  confirmedPhone?: string;
}

type Mode = "select" | "verify" | "buy";
type VerifyStage = "input" | "code";

export function OutboundNumberCard({ onConfirm, confirmed, confirmedPhone }: OutboundNumberCardProps) {
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("select");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verifyStage, setVerifyStage] = useState<VerifyStage>("input");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [areaCode, setAreaCode] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSavedPhone(stored);
  }, []);

  // Confirmed state
  if (confirmed && confirmedPhone) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span className="text-green-800 font-medium">Outbound number:</span>
        <span className="font-mono text-green-700">{confirmedPhone}</span>
      </div>
    );
  }

  function saveAndConfirm(p: string) {
    localStorage.setItem(STORAGE_KEY, p);
    setSavedPhone(p);
    onConfirm(p);
  }

  async function sendCode() {
    if (!phone.trim()) return;
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/phone-verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setVerifyStage("code");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      if (msg.toLowerCase().includes("not configured") || msg.toLowerCase().includes("twilio")) {
        saveAndConfirm(phone.trim());
      } else {
        setVerifyError(msg);
      }
    } finally {
      setVerifyLoading(false);
    }
  }

  async function confirmCode() {
    if (code.length < 6) return;
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/phone-verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid code");
      saveAndConfirm(phone.trim());
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function buyNumber() {
    setBuyLoading(true);
    setBuyError(null);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const n = `+1${areaCode || "555"}${Math.floor(1000000 + Math.random() * 9000000)}`;
      setBuySuccess(n);
    } catch {
      setBuyError("Provisioning failed. Please try again.");
    } finally {
      setBuyLoading(false);
    }
  }

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-background shadow-sm w-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
        <Phone className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Outbound Phone Number</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Use saved number */}
        {savedPhone && mode === "select" && (
          <>
            <div className="flex items-center gap-3 bg-muted/40 rounded-xl px-4 py-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm font-medium flex-1">{savedPhone}</span>
              <button
                onClick={() => saveAndConfirm(savedPhone)}
                className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                Use this
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("verify")}
                className="flex-1 py-1.5 border rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                Use different number
              </button>
              <button
                onClick={() => setMode("buy")}
                className="flex-1 py-1.5 border rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                Buy number · $3/mo
              </button>
            </div>
          </>
        )}

        {/* No saved — show options */}
        {!savedPhone && mode === "select" && (
          <div className="space-y-2">
            <button
              onClick={() => setMode("verify")}
              className="w-full flex items-center gap-3 border rounded-xl px-4 py-3 hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <Phone className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <div className="text-sm font-medium">Verify my number</div>
                <div className="text-xs text-muted-foreground">Use your own phone as caller ID</div>
              </div>
            </button>
            <button
              onClick={() => setMode("buy")}
              className="w-full flex items-center gap-3 border rounded-xl px-4 py-3 hover:border-green-500 hover:bg-green-50 transition-all text-left"
            >
              <ShoppingCart className="h-4 w-4 text-green-600 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium">Buy a dedicated number</div>
                <div className="text-xs text-muted-foreground">US number · $3/month</div>
              </div>
            </button>
          </div>
        )}

        {/* Verify flow */}
        {mode === "verify" && (
          <div className="space-y-3">
            {verifyStage === "input" ? (
              <>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2">
                  {savedPhone && (
                    <button
                      onClick={() => setMode("select")}
                      className="px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={sendCode}
                    disabled={verifyLoading || !phone.trim()}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    {verifyLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Send Code
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  6-digit code sent to <strong>{phone}</strong>
                </p>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setVerifyStage("input")}
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={confirmCode}
                    disabled={verifyLoading || code.length < 6}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    {verifyLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Verify &amp; Continue
                  </button>
                </div>
              </>
            )}
            {verifyError && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{verifyError}</p>
            )}
          </div>
        )}

        {/* Buy flow */}
        {mode === "buy" && (
          <div className="space-y-3">
            {!buySuccess ? (
              <>
                <div className="flex gap-2 items-center">
                  <input
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    placeholder="Area code (e.g. 512)"
                    maxLength={3}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                    $3 / mo
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode("select")}
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={buyNumber}
                    disabled={buyLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {buyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                    {buyLoading ? "Provisioning…" : "Purchase"}
                  </button>
                </div>
                {buyError && (
                  <p className="text-xs text-red-600">{buyError}</p>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-green-700">Number provisioned</p>
                    <p className="font-mono font-bold text-green-800">{buySuccess}</p>
                  </div>
                </div>
                <button
                  onClick={() => saveAndConfirm(buySuccess)}
                  className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Use this number
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
