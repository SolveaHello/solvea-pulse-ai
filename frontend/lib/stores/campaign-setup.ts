import { create } from "zustand";
import type {
  AgentConfig,
  CampaignExtraction,
  PlaceResult,
} from "@/lib/types";

export type SetupStep =
  // New unified wizard steps
  | "type-select"
  | "sales-source"
  | "marketing-source"
  | "marketing-content"
  | "marketing-config"
  // Existing steps
  | "search-contacts"
  | "set-goal"
  | "set-outbound-number"
  | "review"
  | "chat"
  | "confirm-extraction"
  | "agent-config"
  | "contacts";

export type CampaignType = "sales" | "marketing";

interface CampaignSetupState {
  step: SetupStep;
  campaignType: CampaignType | null;

  // Sales path
  selectedContacts: PlaceResult[];
  campaignName: string;
  campaignGoal: string;
  outboundPhone: string;
  extraction: CampaignExtraction | null;
  agentConfig: AgentConfig;
  script: string;
  contactListId: string | null;
  campaignId: string | null;

  // Marketing path
  marketingChannel: "EMAIL" | "SMS";
  targetSegments: string[];
  marketingContactSource: "csv" | "rfm" | null;
  aiContent: string;
  emailSubject: string;
  marketingScheduleAt: string | null;
  marketingName: string;
  marketingObjective: string;

  setStep: (step: SetupStep) => void;
  setCampaignType: (type: CampaignType) => void;

  // Sales setters
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

  // Marketing setters
  setMarketingChannel: (channel: "EMAIL" | "SMS") => void;
  setTargetSegments: (segments: string[]) => void;
  setMarketingContactSource: (source: "csv" | "rfm") => void;
  setAiContent: (content: string) => void;
  setEmailSubject: (subject: string) => void;
  setMarketingScheduleAt: (scheduleAt: string | null) => void;
  setMarketingName: (name: string) => void;
  setMarketingObjective: (objective: string) => void;

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

const INITIAL_STATE = {
  step: "type-select" as SetupStep,
  campaignType: null,
  selectedContacts: [],
  campaignName: "",
  campaignGoal: "",
  outboundPhone: "",
  extraction: null,
  agentConfig: DEFAULT_AGENT_CONFIG,
  script: "",
  contactListId: null,
  campaignId: null,
  marketingChannel: "EMAIL" as const,
  targetSegments: [],
  marketingContactSource: null,
  aiContent: "",
  emailSubject: "",
  marketingScheduleAt: null,
  marketingName: "",
  marketingObjective: "",
};

export const useCampaignSetupStore = create<CampaignSetupState>((set) => ({
  ...INITIAL_STATE,

  setStep: (step) => set({ step }),
  setCampaignType: (campaignType) => set({ campaignType }),

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

  setMarketingChannel: (marketingChannel) => set({ marketingChannel }),
  setTargetSegments: (targetSegments) => set({ targetSegments }),
  setMarketingContactSource: (marketingContactSource) => set({ marketingContactSource }),
  setAiContent: (aiContent) => set({ aiContent }),
  setEmailSubject: (emailSubject) => set({ emailSubject }),
  setMarketingScheduleAt: (marketingScheduleAt) => set({ marketingScheduleAt }),
  setMarketingName: (marketingName) => set({ marketingName }),
  setMarketingObjective: (marketingObjective) => set({ marketingObjective }),

  reset: () => set(INITIAL_STATE),
}));
