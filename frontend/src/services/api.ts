import { CallRecord, CallReportData, TranscriptItem } from '../types/call.js';

const API_BASE = '/api';

export interface InitiateCallResponse {
  callId: string;
  customerPhoneNumber: string;
  twilioCallSid: string | null;
  livekitRoomId: string;
  status: string;
  agentToken: string;
  customerToken: string;
  livekitUrl: string;
  isMock: boolean;
}

export const api = {
  async initiateCall(
    customerPhoneNumber: string,
    simulatedScenario = 'standard'
  ): Promise<InitiateCallResponse> {
    const res = await fetch(`${API_BASE}/calls/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerPhoneNumber, simulatedScenario }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to initiate call');
    }
    return res.json();
  },

  async endCall(callId: string, callOutcome = 'Call completed'): Promise<{ success: boolean; call: CallRecord; report: CallReportData }> {
    const res = await fetch(`${API_BASE}/calls/${callId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callOutcome }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to end call');
    }
    return res.json();
  },

  async getCall(callId: string): Promise<CallRecord> {
    const res = await fetch(`${API_BASE}/calls/${callId}`);
    if (!res.ok) throw new Error('Call not found');
    return res.json();
  },

  async listCalls(): Promise<CallRecord[]> {
    const res = await fetch(`${API_BASE}/calls`);
    if (!res.ok) throw new Error('Failed to fetch call history');
    return res.json();
  },

  async getCallTranscript(callId: string): Promise<TranscriptItem[]> {
    const res = await fetch(`${API_BASE}/calls/${callId}/transcript`);
    if (!res.ok) throw new Error('Failed to fetch transcript');
    return res.json();
  },

  async getCallReport(callId: string): Promise<CallReportData> {
    const res = await fetch(`${API_BASE}/calls/${callId}/report`);
    if (!res.ok) throw new Error('Failed to fetch call report');
    return res.json();
  },

  async submitFeedback(
    suggestionId: string,
    feedback: {
      status: 'ACCEPTED' | 'REJECTED' | 'EDITED';
      editedResponse?: string | null;
      notes?: string | null;
    }
  ) {
    const res = await fetch(`${API_BASE}/suggestions/${suggestionId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    });
    if (!res.ok) throw new Error('Failed to submit feedback');
    return res.json();
  },

  async analyzeStatement(callId: string, statement: string, speaker: 'customer' | 'agent' = 'customer') {
    const res = await fetch(`${API_BASE}/objections/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId, customerStatement: statement, speaker }),
    });
    if (!res.ok) throw new Error('Failed to analyze objection');
    return res.json();
  },
};
