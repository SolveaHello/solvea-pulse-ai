import { create } from "zustand";
import type {
  AgentConfig,
  CampaignExtraction,
  PlaceResult,
} from "@/lib/types";

export type SetupStep =
  | "search-contacts"
  | "set-goal"
  | "set-outbound-number"
  | "review"
  // legacy steps kept for compatibility
  | "chat"
  | "confirm-extraction"
  | "agent-config"
  | "contacts";

interface CampaignSetupState {
  step: SetupStep;
  selectedContacts: PlaceResult[];
  campaignName: string;
  campaignGoal: string;
  outboundPhone: string;
  extraction: CampaignExtraction | null;
  agentConfig: AgentConfig;
  script: string;
  contactListId: string | null;
  campaignId: string | null;

  setStep: (step: SetupStep) => void;
  setSelectedContacts: (contacts: PlaceResult[]) => void;
  setCampaignName: (name: string) => void;
  setCampaignGoal: (goal: string) => void;
  setOutboundPhone: (phone: string) => void;
  setExtraction: (extraction: CampaignExtraction) => void;
  updateExtraction: (partial: Partial<CampaignExtraction>) => void;
  setAgentConfig: (config: AgentConfig) => void;
  updateAgentConfig: (partial: Partial<AgentConfig>) => void;
  setScript: (script: string) => void;
  setContactListId: (id: string) => void;
  setCampaignId: (id: string) => void;
  reset: () => void;
}

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  voiceProvider: "elevenlabs",
  voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - ElevenLabs default
  voiceName: "Rachel",
  tone: "professional",
  speed: 1.0,
  firstMessage:
    "Hi, this is an AI assistant calling on behalf of {company}. Is this a good time to talk?",
};

export const useCampaignSetupStore = create<CampaignSetupState>((set) => ({
  step: "search-contacts",
  selectedContacts: [],
  campaignName: "",
  campaignGoal: "",
  outboundPhone: "",
  extraction: null,
  agentConfig: DEFAULT_AGENT_CONFIG,
  script: "",
  contactListId: null,
  campaignId: null,

  setStep: (step) => set({ step }),
  setSelectedContacts: (selectedContacts) => set({ selectedContacts }),
  setCampaignName: (campaignName) => set({ campaignName }),
  setCampaignGoal: (campaignGoal) => set({ campaignGoal }),
  setOutboundPhone: (outboundPhone) => set({ outboundPhone }),
  setExtraction: (extraction) => set({ extraction }),
  updateExtraction: (partial) =>
    set((state) => ({
      extraction: state.extraction ? { ...state.extraction, ...partial } : null,
    })),
  setAgentConfig: (agentConfig) => set({ agentConfig }),
  updateAgentConfig: (partial) =>
    set((state) => ({ agentConfig: { ...state.agentConfig, ...partial } })),
  setScript: (script) => set({ script }),
  setContactListId: (contactListId) => set({ contactListId }),
  setCampaignId: (campaignId) => set({ campaignId }),
  reset: () =>
    set({
      step: "search-contacts",
      selectedContacts: [],
      campaignName: "",
      campaignGoal: "",
      outboundPhone: "",
      extraction: null,
      agentConfig: DEFAULT_AGENT_CONFIG,
      script: "",
      contactListId: null,
      campaignId: null,
    }),
}));
