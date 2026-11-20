import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LiveCallScreen } from '../screens/LiveCallScreen.js';
import { CallRecord, ObjectionItem, SuggestionItem, TranscriptItem } from '../types/call.js';

describe('LiveCallScreen (Frontend)', () => {
  const dummyCall: CallRecord = {
    id: 'call_123',
    customerPhoneNumber: '+15557778888',
    livekitRoomId: 'room_123',
    status: 'IN_PROGRESS',
    startTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const dummyTranscripts: TranscriptItem[] = [
    {
      id: 't_1',
      callId: 'call_123',
      speaker: 'agent',
      text: 'Good morning, how can I help you?',
      isFinal: true,
      timestamp: new Date().toISOString(),
    },
    {
      id: 't_2',
      callId: 'call_123',
      speaker: 'customer',
      text: 'Your software is way too expensive for our budget.',
      isFinal: true,
      timestamp: new Date().toISOString(),
    },
  ];

  const dummyObjection: ObjectionItem = {
    id: 'obj_1',
    callId: 'call_123',
    category: 'Pricing or budget concerns',
    customerStatement: 'Your software is way too expensive for our budget.',
    customerIntent: 'Looking for discounts or payment plans',
    sentiment: 'negative',
    confidence: 0.92,
    detectedAt: new Date().toISOString(),
  };

  const dummySuggestion: SuggestionItem = {
    id: 'sug_1',
    objectionId: 'obj_1',
    primaryResponse: 'I completely understand budget constraints. What if we explore a phased rollout?',
    alternativeResponses: [
      'We also offer quarterly billing to ease upfront costs.',
      'Could you share your current software ROI targets?',
    ],
    rationale: 'Acknowledge budget and pivot to ROI.',
    sentimentAnalysis: 'Customer is guarded about cost.',
    createdAt: new Date().toISOString(),
  };

  it('renders phone number, call status, and end call button', () => {
    const handleEndCall = vi.fn();

    render(
      <LiveCallScreen
        currentCall={dummyCall}
        transcripts={dummyTranscripts}
        partialTranscript={null}
        latestObjection={dummyObjection}
        latestSuggestion={dummySuggestion}
        isMuted={false}
        audioStatusText="Audio Channel Ready"
        onToggleMute={vi.fn()}
        onEndCall={handleEndCall}
        onFeedback={vi.fn()}
        onSendSimulationStatement={vi.fn()}
      />
    );

    expect(screen.getByText('+15557778888')).toBeInTheDocument();
    expect(screen.getByText('End Call')).toBeInTheDocument();

    fireEvent.click(screen.getByText('End Call'));
    expect(handleEndCall).toHaveBeenCalledTimes(1);
  });

  it('renders transcripts for both agent and customer', () => {
    render(
      <LiveCallScreen
        currentCall={dummyCall}
        transcripts={dummyTranscripts}
        partialTranscript={null}
        latestObjection={dummyObjection}
        latestSuggestion={dummySuggestion}
        isMuted={false}
        audioStatusText="Audio Channel Ready"
        onToggleMute={vi.fn()}
        onEndCall={vi.fn()}
        onFeedback={vi.fn()}
        onSendSimulationStatement={vi.fn()}
      />
    );

    expect(screen.getByText('Good morning, how can I help you?')).toBeInTheDocument();
    expect(screen.getByText('Your software is way too expensive for our budget.')).toBeInTheDocument();
  });

  it('displays detected objection details and confidence', () => {
    render(
      <LiveCallScreen
        currentCall={dummyCall}
        transcripts={dummyTranscripts}
        partialTranscript={null}
        latestObjection={dummyObjection}
        latestSuggestion={dummySuggestion}
        isMuted={false}
        audioStatusText="Audio Channel Ready"
        onToggleMute={vi.fn()}
        onEndCall={vi.fn()}
        onFeedback={vi.fn()}
        onSendSimulationStatement={vi.fn()}
      />
    );

    expect(screen.getByText('Pricing or budget concerns')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('Negative Friction')).toBeInTheDocument();
  });

  it('allows agent to view, copy, accept, and reject suggestions', () => {
    const handleFeedback = vi.fn();

    render(
      <LiveCallScreen
        currentCall={dummyCall}
        transcripts={dummyTranscripts}
        partialTranscript={null}
        latestObjection={dummyObjection}
        latestSuggestion={dummySuggestion}
        isMuted={false}
        audioStatusText="Audio Channel Ready"
        onToggleMute={vi.fn()}
        onEndCall={vi.fn()}
        onFeedback={handleFeedback}
        onSendSimulationStatement={vi.fn()}
      />
    );

    expect(
      screen.getByText('I completely understand budget constraints. What if we explore a phased rollout?')
    ).toBeInTheDocument();

    // Click Accept
    fireEvent.click(screen.getByText('Accept'));
    expect(handleFeedback).toHaveBeenCalledWith('sug_1', 'ACCEPTED');

    // Click Reject
    fireEvent.click(screen.getByText('Reject'));
    expect(handleFeedback).toHaveBeenCalledWith('sug_1', 'REJECTED');

    // Click Copy
    fireEvent.click(screen.getByText('Copy Response'));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
