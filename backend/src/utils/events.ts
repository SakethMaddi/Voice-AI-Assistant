export type WebSocketEventType =
  | 'call.started'
  | 'call.connected'
  | 'call.ended'
  | 'transcript.partial'
  | 'transcript.final'
  | 'objection.detected'
  | 'suggestion.generated'
  | 'suggestion.feedback'
  | 'sentiment.updated';

export interface BaseWSEvent<T = unknown> {
  event: WebSocketEventType;
  callId: string;
  timestamp: string;
  data: T;
}

export interface CallStartedEventData {
  callId: string;
  customerPhoneNumber: string;
  livekitRoomId: string;
  status: string;
}

export interface CallConnectedEventData {
  callId: string;
  livekitRoomId: string;
  status: string;
  connectedAt: string;
}

export interface CallEndedEventData {
  callId: string;
  duration: number;
  status: string;
  endedAt: string;
}

export interface TranscriptEventData {
  id: string;
  callId: string;
  speaker: 'agent' | 'customer';
  text: string;
  isFinal: boolean;
  timestamp: string;
}

export interface ObjectionDetectedEventData {
  id: string;
  callId: string;
  category: string;
  customerStatement: string;
  customerIntent: string;
  sentiment: string;
  confidence: number;
  detectedAt: string;
}

export interface SuggestionGeneratedEventData {
  id: string;
  objectionId: string;
  primaryResponse: string;
  alternativeResponses: string[];
  rationale: string;
  sentimentAnalysis: string;
  createdAt: string;
}

export interface SuggestionFeedbackEventData {
  id: string;
  suggestionId: string;
  status: 'ACCEPTED' | 'REJECTED' | 'EDITED';
  editedResponse?: string | null;
  feedbackTimestamp: string;
}

export interface SentimentUpdatedEventData {
  callId: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  rationale?: string;
  timestamp: string;
}
