import React from 'react';
import { LiveKitAudioBar } from '../components/LiveKitAudioBar.js';
import { TranscriptViewer } from '../components/TranscriptViewer.js';
import { ObjectionCard } from '../components/ObjectionCard.js';
import { SuggestionCard } from '../components/SuggestionCard.js';
import { CallRecord, ObjectionItem, SuggestionItem, TranscriptItem } from '../types/call.js';

interface LiveCallScreenProps {
  currentCall: CallRecord | null;
  transcripts: TranscriptItem[];
  partialTranscript: TranscriptItem | null;
  latestObjection: ObjectionItem | null;
  latestSuggestion: SuggestionItem | null;
  isMuted: boolean;
  audioStatusText: string;
  onToggleMute: () => void;
  onEndCall: () => void;
  onFeedback: (
    suggestionId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'EDITED',
    editedResponse?: string
  ) => void;
  onSendSimulationStatement: (text: string) => void;
}

export const LiveCallScreen: React.FC<LiveCallScreenProps> = ({
  currentCall,
  transcripts,
  partialTranscript,
  latestObjection,
  latestSuggestion,
  isMuted,
  audioStatusText,
  onToggleMute,
  onEndCall,
  onFeedback,
  onSendSimulationStatement,
}) => {
  if (!currentCall) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-slate-500">
        <p>No active call in session.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-6">
      {/* Top Audio Bar with customer info, timer, mute, and end call */}
      <LiveKitAudioBar
        customerPhoneNumber={currentCall.customerPhoneNumber}
        startTime={currentCall.startTime}
        callStatus={currentCall.status}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onEndCall={onEndCall}
        audioStatusText={audioStatusText}
      />

      {/* Main Grid: Left side Transcript, Right side AI Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Speech Transcript */}
        <div className="lg:col-span-6 space-y-4">
          <TranscriptViewer
            transcripts={transcripts}
            partialTranscript={partialTranscript}
            onSendSimulationStatement={onSendSimulationStatement}
          />
        </div>

        {/* Right Column: AI Objection & Suggestion Engine */}
        <div className="lg:col-span-6 space-y-6">
          {/* Detected Objection */}
          <ObjectionCard objection={latestObjection} />

          {/* AI Response Suggestions & Agent Feedback */}
          <SuggestionCard
            suggestion={latestSuggestion}
            onFeedback={onFeedback}
          />
        </div>
      </div>
    </div>
  );
};
