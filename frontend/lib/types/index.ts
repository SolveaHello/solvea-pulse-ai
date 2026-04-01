export type CampaignStatus =
  | "DRAFT"
  | "CONFIGURED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

export type CallStatus =
  | "QUEUED"
  | "RINGING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "BUSY"
  | "NO_ANSWER";

export type Disposition =
  | "PENDING"
  | "CALLED"
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "VOICEMAIL"
  | "NO_ANSWER"
  | "DNC"
  | "CALLBACK_REQUESTED"
  | "CONFIRMED"
  | "CONVERTED";

export type FollowUpChannel = "EMAIL" | "SMS";
export type FollowUpStatus = "PENDING" | "SENT" | "REPLIED" | "FAILED" | "SKIPPED";

export type SourceType = "GOOGLE_MAPS" | "CSV_UPLOAD" | "MANUAL";

export type VoiceProvider = "elevenlabs" | "openai" | "playht" | "deepgram";
export type VoiceTone = "professional" | "friendly" | "casual" | "energetic";

export interface AgentConfig {
  voiceProvider: VoiceProvider;
  voiceId: string;
  voiceName: string;
  tone: VoiceTone;
  speed: number; // 0.5–2.0
  firstMessage: string;
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  objective: string;
  targetAudience?: string;
  talkingPoints: string[];
  agentConfig: AgentConfig;
  script: string;
  vapiAssistantId?: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    contacts: number;
    calls: number;
  };
}

export interface Contact {
  id: string;
  contactListId: string;
  name?: string;
  businessName?: string;
  phone: string;
  email?: string;
  address?: string;
  website?: string;
  placeId?: string;
  customFields?: Record<string, string>;
  disposition: Disposition;
  createdAt: string;
}

export interface ContactList {
  id: string;
  campaignId: string;
  name: string;
  sourceType: SourceType;
  createdAt: string;
  contacts: Contact[];
  _count?: { contacts: number };
}

export interface Call {
  id: string;
  campaignId: string;
  contactId: string;
  contact?: Contact;
  vapiCallId?: string;
  status: CallStatus;
  duration?: number;
  startedAt?: string;
  endedAt?: string;
  endReason?: string;
  disposition: Disposition;
  costCents?: number;
  createdAt: string;
  updatedAt: string;
  recording?: Recording;
  transcript?: Transcript;
  summary?: CallSummary;
  appointment?: Appointment;
}

export interface Recording {
  id: string;
  callId: string;
  vapiUrl?: string;
  s3Url?: string;
  durationSecs?: number;
  createdAt: string;
}

export interface TranscriptMessage {
  role: "assistant" | "user";
  content: string;
  timestamp?: string;
}

export interface Transcript {
  id: string;
  callId: string;
  rawText: string;
  translatedText?: string;
  language?: string;
  messages: TranscriptMessage[];
  createdAt: string;
}

export interface CallSummary {
  id: string;
  callId: string;
  summary: string;
  keyPoints: string[];
  sentiment?: "positive" | "neutral" | "negative";
  nextAction?: string;
  extractedData?: Record<string, string>;
  createdAt: string;
}

export interface Appointment {
  id: string;
  callId: string;
  googleEventId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendeeEmail?: string;
  attendeeName?: string;
  meetingLink?: string;
  status: string;
  createdAt: string;
}

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  userRatingsTotal?: number;
  photos?: string[]; // image URLs returned by the maps API
}

export interface CampaignExtraction {
  name: string;
  objective: string;
  targetAudience: string;
  talkingPoints: string[];
  tone: VoiceTone;
  restrictions: string[];
}

export interface CallStatusEvent {
  type: "call-started" | "call-ended" | "call-updated";
  callId: string;
  vapiCallId?: string;
  status: CallStatus;
  disposition?: Disposition;
  duration?: number;
}

export interface CampaignStats {
  total: number;
  queued: number;
  inProgress: number;
  completed: number;
  interested: number;
  appointments: number;
  connectionRate: number;
  interestRate: number;
}

export interface FollowUp {
  id: string;
  contactId: string;
  campaignId: string;
  callId?: string;
  channel: FollowUpChannel;
  status: FollowUpStatus;
  subject?: string;
  content: string;
  sentAt?: string;
  repliedAt?: string;
  replyContent?: string;
  createdAt: string;
}

export interface DailyReport {
  id: string;
  userId: string;
  campaignId?: string;
  reportDate: string;
  totalCalls: number;
  connectedCalls: number;
  interestedCount: number;
  notInterestedCount: number;
  voicemailCount: number;
  noAnswerCount: number;
  callbackCount: number;
  confirmedCount: number;
  convertedCount: number;
  followUpsSent: number;
  costCents: number;
  connectionRate: number;
  interestRate: number;
  insights: string[];
  recommendations: string[];
  createdAt: string;
}
