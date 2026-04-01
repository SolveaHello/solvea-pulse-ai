"use client";

import { useState } from "react";
import { useCampaignSetupStore } from "@/lib/stores/campaign-setup";
import type { VoiceProvider, VoiceTone } from "@/lib/types";
import { campaignApi } from "@/lib/api-client";

const VOICE_OPTIONS = [
  { provider: "elevenlabs" as VoiceProvider, id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel — Professional Female" },
  { provider: "elevenlabs" as VoiceProvider, id: "AZnzlk1XvdvUeBnXmlld", name: "Domi — Confident Male" },
  { provider: "openai" as VoiceProvider, id: "alloy", name: "Alloy (OpenAI)" },
  { provider: "openai" as VoiceProvider, id: "nova", name: "Nova (OpenAI)" },
];

const TONE_OPTIONS: { value: VoiceTone; label: string; desc: string }[] = [
  { value: "professional", label: "Professional", desc: "Formal and business-focused" },
  { value: "friendly", label: "Friendly", desc: "Warm and approachable" },
  { value: "casual", label: "Casual", desc: "Relaxed and conversational" },
  { value: "energetic", label: "Energetic", desc: "Enthusiastic and upbeat" },
];

export function AgentConfigurator() {
  const {
    extraction,
    agentConfig,
    script,
    updateAgentConfig,
    setScript,
    setStep,
    setCampaignId,
  } = useCampaignSetupStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [vapiError, setVapiError] = useState<string | null>(null);

  async function generateScript() {
    if (!extraction) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Generate the outbound agent script based on this campaign data:
Campaign: ${extraction.name}
Objective: ${extraction.objective}
Target Audience: ${extraction.targetAudience}
Talking Points: ${extraction.talkingPoints.join(", ")}
Tone: ${extraction.tone}
Voice Speed: ${agentConfig.speed}x

Generate the complete Vapi system prompt for this AI agent. Output ONLY the script text, no explanation.`,
            },
          ],
        }),
      });

      if (!res.ok || !res.body) throw new Error("Failed to generate script");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("0:")) {
            content += JSON.parse(line.slice(2));
            setScript(content);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveAndContinue() {
    if (!extraction) return;
    setIsSaving(true);
    setVapiError(null);
    try {
      const campaign = await campaignApi.create({
        name: extraction.name,
        objective: extraction.objective,
        targetAudience: extraction.targetAudience,
        talkingPoints: extraction.talkingPoints,
        agentConfig,
        script,
        status: "CONFIGURED",
      });

      // Create Vapi assistant via FastAPI
      const vapiRes = await fetch(
        `/backend/api/v1/campaigns/${campaign.id}/vapi-assistant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentConfig, script }),
        }
      );

      if (!vapiRes.ok) {
        const err = await vapiRes.text();
        setVapiError(`Vapi setup failed: ${err}`);
        setIsSaving(false);
        return;
      }

      const { assistantId } = await vapiRes.json();
      await campaignApi.update(campaign.id, { vapiAssistantId: assistantId });

      setCampaignId(campaign.id);
      setStep("contacts");
    } catch (err) {
      setVapiError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Configure AI Agent</h2>
        <p className="text-sm text-muted-foreground">
          Choose the voice and tone for your outbound calling AI.
        </p>
      </div>

      {/* Voice selection */}
      <div>
        <label className="text-sm font-medium mb-2 block">Voice</label>
        <div className="grid grid-cols-2 gap-2">
          {VOICE_OPTIONS.map((v) => (
            <button
              key={v.id}
              onClick={() =>
                updateAgentConfig({
                  voiceProvider: v.provider,
                  voiceId: v.id,
                  voiceName: v.name,
                })
              }
              className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                agentConfig.voiceId === v.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tone selection */}
      <div>
        <label className="text-sm font-medium mb-2 block">Tone</label>
        <div className="grid grid-cols-2 gap-2">
          {TONE_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => updateAgentConfig({ tone: t.value })}
              className={`p-3 rounded-lg border text-left transition-colors ${
                agentConfig.tone === t.value
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted"
              }`}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <div className="text-xs text-muted-foreground">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Speed */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Speech Speed: {agentConfig.speed}x
        </label>
        <input
          type="range"
          min="0.7"
          max="1.5"
          step="0.1"
          value={agentConfig.speed}
          onChange={(e) => updateAgentConfig({ speed: parseFloat(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Slower</span>
          <span>Faster</span>
        </div>
      </div>

      {/* Script */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">Agent Script</label>
          <button
            onClick={generateScript}
            disabled={isGenerating}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate with AI"}
          </button>
        </div>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Click 'Generate with AI' or write the agent's instructions manually..."
          rows={8}
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        />
      </div>

      {vapiError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {vapiError}
        </div>
      )}

      <button
        onClick={saveAndContinue}
        disabled={isSaving || !script}
        className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isSaving ? "Setting up agent..." : "Save & Add Contacts →"}
      </button>
    </div>
  );
}
