import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CallReportsScreen } from '../screens/CallReportsScreen.js';
import { CallReportData } from '../types/call.js';

describe('CallReportsScreen (Frontend)', () => {
  const dummyReport: CallReportData = {
    id: 'rep_1',
    callId: 'call_123',
    objectionReport: {
      totalObjections: 2,
      categoryBreakdown: {
        'Pricing or budget concerns': 1,
        'Timing concerns': 1,
      },
      objectionsList: [
        {
          id: 'obj_1',
          category: 'Pricing or budget concerns',
          customerStatement: 'Too expensive for us right now.',
          sentiment: 'negative',
          confidence: 0.9,
          suggestions: [
            {
              id: 'sug_1',
              primaryResponse: 'We have flexible phased pricing.',
              alternativeResponses: ['Quarterly plan available.'],
              rationale: 'Ease budget friction',
              feedbacks: [
                {
                  status: 'ACCEPTED',
                  feedbackTimestamp: new Date().toISOString(),
                },
              ],
            },
          ],
        },
      ],
      totalAccepted: 1,
      totalRejected: 0,
      totalEdited: 0,
    },
    agentPerformanceReport: {
      objectionsFaced: 2,
      objectionsHandledWithAI: 1,
      suggestionsAccepted: 1,
      suggestionsRejected: 0,
      suggestionsEdited: 0,
      acceptanceRatePercentage: 100,
      callOutcome: 'Call completed successfully',
      notes: 'Agent utilized AI guidance',
    },
    aiAccuracyReport: {
      objectionsDetected: 2,
      suggestionsGenerated: 2,
      suggestionsAccepted: 1,
      suggestionsRejected: 0,
      perceivedAccuracyRatePercentage: 100,
      feedbackNotes: ['Great objection guidance'],
      disclaimer: 'Note: Suggestion acceptance or rejection indicates agent alignment with recommended wording and does not constitute guaranteed customer conversion.',
    },
    createdAt: new Date().toISOString(),
  };

  it('renders objection analytics, agent performance, and AI accuracy metrics', () => {
    render(
      <CallReportsScreen
        report={dummyReport}
        callList={[]}
        onSelectCall={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('Post-Call Analytics & Reports')).toBeInTheDocument();
    expect(screen.getByText('Objections Detected')).toBeInTheDocument();
    expect(screen.getAllByText('Pricing or budget concerns').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Timing concerns')).toBeInTheDocument();
    expect(screen.getByText('Agent Performance Review')).toBeInTheDocument();
    expect(screen.getByText('AI Accuracy & Reliability Report')).toBeInTheDocument();
    expect(screen.getByText(/guaranteed customer conversion/)).toBeInTheDocument();
  });
});
