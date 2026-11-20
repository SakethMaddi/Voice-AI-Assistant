export type CallStatus =
  | 'INITIATED'
  | 'RINGING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'NO_ANSWER';

export interface TranscriptItem {
  id: string;
  callId: string;
  speaker: 'agent' | 'customer';
  text: string;
  isFinal: boolean;
  timestamp: string;
}

export interface ObjectionItem {
  id: string;
  callId: string;
  category: string;
  customerStatement: string;
  customerIntent: string;
  sentiment: 'positive' | 'neutral' | 'negative' | string;
  confidence: number;
  detectedAt: string;
  suggestions?: SuggestionItem[];
}

export interface SuggestionItem {
  id: string;
  objectionId: string;
  primaryResponse: string;
  alternativeResponses: string[];
  rationale: string;
  sentimentAnalysis: string;
  createdAt: string;
  feedbackStatus?: 'ACCEPTED' | 'REJECTED' | 'EDITED';
  editedResponse?: string | null;
}

export interface CallRecord {
  id: string;
  customerPhoneNumber: string;
  twilioCallSid?: string | null;
  livekitRoomId: string;
  status: CallStatus;
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
  createdAt: string;
  transcripts?: TranscriptItem[];
  objections?: ObjectionItem[];
  reports?: any[];
}

export interface CallReportData {
  id: string;
  callId: string;
  objectionReport: {
    totalObjections: number;
    categoryBreakdown: Record<string, number>;
    objectionsList: Array<{
      id: string;
      category: string;
      customerStatement: string;
      sentiment: string;
      confidence: number;
      suggestions: Array<{
        id: string;
        primaryResponse: string;
        alternativeResponses: string[];
        rationale: string;
        feedbacks: Array<{
          status: string;
          editedResponse?: string | null;
          feedbackTimestamp: string;
        }>;
      }>;
    }>;
    totalAccepted: number;
    totalRejected: number;
    totalEdited: number;
  };
  agentPerformanceReport: {
    objectionsFaced: number;
    objectionsHandledWithAI: number;
    suggestionsAccepted: number;
    suggestionsRejected: number;
    suggestionsEdited: number;
    acceptanceRatePercentage: number;
    callOutcome: string;
    notes: string;
  };
  aiAccuracyReport: {
    objectionsDetected: number;
    suggestionsGenerated: number;
    suggestionsAccepted: number;
    suggestionsRejected: number;
    perceivedAccuracyRatePercentage: number;
    feedbackNotes: string[];
    disclaimer: string;
  };
  createdAt: string;
}
