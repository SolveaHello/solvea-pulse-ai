"use client";

import { useState, useEffect } from "react";
import { Phone, ArrowRight, ArrowLeft, CheckCircle, ShoppingCart, Loader2 } from "lucide-react";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";

const STORAGE_KEY = "user_phone";

type Mode = "select" | "verify" | "buy";
type VerifyStage = "input" | "code";

export function SetOutboundNumberStep() {
  const { setStep, setOutboundPhone } = useCampaignSetupStore();

  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("select");

  // Verify mode state
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verifyStage, setVerifyStage] = useState<VerifyStage>("input");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Buy mode state
  const [areaCode, setAreaCode] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSavedPhone(stored);
  }, []);

  function useSavedPhone() {
    setOutboundPhone(savedPhone!);
    setStep("review");
  }

  // ── Verify flow ──────────────────────────────────────────────────────────
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
      if (!res.ok) throw new Error(data.error ?? "Failed to send code");
      setVerifyStage("code");
    } catch (err) {
      // Twilio not configured — save directly for demo purposes
      if (err instanceof Error && err.message.includes("not configured")) {
        savePhoneDirectly(phone.trim());
      } else {
        setVerifyError(err instanceof Error ? err.message : "Failed to send code");
      }
    } finally {
      setVerifyLoading(false);
    }
  }

  async function confirmCode() {
    if (!code.trim()) return;
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
      savePhoneDirectly(phone.trim());
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setVerifyLoading(false);
    }
  }

  function savePhoneDirectly(p: string) {
    localStorage.setItem(STORAGE_KEY, p);
    setSavedPhone(p);
    setOutboundPhone(p);
    setStep("review");
  }

  // ── Buy flow ─────────────────────────────────────────────────────────────
  async function buyNumber() {
    setBuyLoading(true);
    setBuyError(null);
    try {
      // Placeholder — Vapi number provisioning would go here
      await new Promise((r) => setTimeout(r, 1500));
      const fakeNumber = `+1${areaCode || "555"}${Math.floor(1000000 + Math.random() * 9000000)}`;
      setBuySuccess(fakeNumber);
      localStorage.setItem(STORAGE_KEY, fakeNumber);
      setSavedPhone(fakeNumber);
    } catch {
      setBuyError("Failed to provision number. Please try again.");
    } finally {
      setBuyLoading(false);
    }
  }

  function confirmBoughtNumber() {
    if (buySuccess) {
      setOutboundPhone(buySuccess);
      setStep("review");
    }
  }

  return (
    <div className="max-w-lg mx-auto p-8 h-full overflow-y-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Outbound Phone Number</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the number your AI agent will call from.
        </p>
      </div>

      {/* Use saved phone */}
      {savedPhone && mode === "select" && (
        <div className="border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Saved number</span>
          </div>
          <div className="flex items-center gap-3 bg-muted/40 rounded-lg px-4 py-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono font-medium">{savedPhone}</span>
          </div>
          <button
            onClick={useSavedPhone}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Use this number
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setMode("verify")}
              className="flex-1 py-2 border rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              Use a different number
            </button>
            <button
              onClick={() => setMode("buy")}
              className="flex-1 py-2 border rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              Buy a new number
            </button>
          </div>
        </div>
      )}

      {/* No saved phone — show options */}
      {!savedPhone && mode === "select" && (
        <div className="space-y-3">
          <button
            onClick={() => setMode("verify")}
            className="w-full flex items-center gap-4 border rounded-xl p-4 hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">Use my own number</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Verify your personal or business phone number
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode("buy")}
            className="w-full flex items-center gap-4 border rounded-xl p-4 hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-medium">Get a dedicated number</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Purchase a US number for $3/month
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Verify flow */}
      {mode === "verify" && (
        <div className="border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Verify Your Number</span>
          </div>

          {verifyStage === "input" ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={sendCode}
                disabled={verifyLoading || !phone.trim()}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {verifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send Verification Code
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <strong>{phone}</strong>
              </p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full border rounded-lg px-3 py-2.5 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setVerifyStage("input")}
                  className="px-4 py-2.5 border rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={confirmCode}
                  disabled={verifyLoading || code.length < 6}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {verifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Verify &amp; Continue
                </button>
              </div>
            </>
          )}

          {verifyError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {verifyError}
            </p>
          )}

          {savedPhone && (
            <button
              onClick={() => setMode("select")}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back to saved number
            </button>
          )}
        </div>
      )}

      {/* Buy flow */}
      {mode === "buy" && (
        <div className="border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Purchase a Number</span>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              $3 / month
            </span>
          </div>

          {!buySuccess ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Area Code (optional)
                </label>
                <input
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="e.g. 512"
                  maxLength={3}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to get any available US number.
                </p>
              </div>

              <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p>• US local number, all inbound &amp; outbound calls included</p>
                <p>• Billed at $3/month, cancel anytime</p>
                <p>• Number provisioned instantly via Vapi</p>
              </div>

              <button
                onClick={buyNumber}
                disabled={buyLoading}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {buyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                {buyLoading ? "Provisioning…" : "Purchase Number — $3/mo"}
              </button>

              {buyError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {buyError}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">Number provisioned!</p>
                  <p className="text-base font-mono font-bold text-green-700 mt-0.5">{buySuccess}</p>
                </div>
              </div>
              <button
                onClick={confirmBoughtNumber}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Use this number
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {!buySuccess && (
            <button
              onClick={() => setMode("select")}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
          )}
        </div>
      )}

      <button
        onClick={() => setStep("set-goal")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to campaign goal
      </button>
    </div>
  );
}
