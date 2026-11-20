import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.js';
import { DashboardScreen } from './screens/DashboardScreen.js';
import { LiveCallScreen } from './screens/LiveCallScreen.js';
import { CallReportsScreen } from './screens/CallReportsScreen.js';
import { api } from './services/api.js';
import { wsClient } from './services/websocket.js';
import { LiveKitAudioSession, LiveKitConnectionState } from './services/livekit.js';
import {
  CallRecord,
  CallReportData,
  ObjectionItem,
  SuggestionItem,
  TranscriptItem,
} from './types/call.js';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'live-call' | 'reports'>('dashboard');
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [callList, setCallList] = useState<CallRecord[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [partialTranscript, setPartialTranscript] = useState<TranscriptItem | null>(null);
  const [latestObjection, setLatestObjection] = useState<ObjectionItem | null>(null);
  const [latestSuggestion, setLatestSuggestion] = useState<SuggestionItem | null>(null);
  const [selectedReport, setSelectedReport] = useState<CallReportData | null>(null);

  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioStatusText, setAudioStatusText] = useState('Standby');

  const livekitSessionRef = useRef<LiveKitAudioSession>(new LiveKitAudioSession());

  // Load initial call history
  const loadCalls = async () => {
    try {
      const calls = await api.listCalls();
      setCallList(calls);
    } catch (err) {
      console.warn('Could not load call history yet:', err);
    }
  };

  useEffect(() => {
    loadCalls();
    wsClient.connect();

    const unsubscribeWs = wsClient.onEvent((event: string, data: any) => {
      setIsWsConnected(true);

      switch (event) {
        case 'call.started':
          setActiveCall((prev) => (prev ? { ...prev, status: data.status } : null));
          break;

        case 'call.connected':
          setActiveCall((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
          break;

        case 'call.ended':
          setActiveCall((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
          // Refresh calls and load report
          loadCalls();
          if (data.callId) {
            handleViewReport(data.callId);
          }
          break;

        case 'transcript.partial':
          setPartialTranscript(data);
          break;

        case 'transcript.final':
          setPartialTranscript(null);
          setTranscripts((prev) => {
            // Deduplicate if already received
            if (prev.some((t) => t.id === data.id)) return prev;
            return [...prev, data];
          });
          break;

        case 'objection.detected':
          setLatestObjection(data);
          break;

        case 'suggestion.generated':
          setLatestSuggestion(data);
          break;

        case 'suggestion.feedback':
          setLatestSuggestion((prev) => {
            if (!prev) return null;
            if (prev.id === data.suggestionId) {
              return {
                ...prev,
                feedbackStatus: data.status,
                editedResponse: data.editedResponse,
              };
            }
            return prev;
          });
          break;

        default:
          break;
      }
    });

    return () => {
      unsubscribeWs();
      wsClient.disconnect();
      livekitSessionRef.current.disconnect();
    };
  }, []);

  // Initiate Call
  const handleStartCall = async (phoneNumber: string, scenario?: string) => {
    setIsInitiating(true);
    try {
      const resp = await api.initiateCall(phoneNumber, scenario);

      const newCall: CallRecord = {
        id: resp.callId,
        customerPhoneNumber: resp.customerPhoneNumber,
        twilioCallSid: resp.twilioCallSid,
        livekitRoomId: resp.livekitRoomId,
        status: resp.status as any,
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      setActiveCall(newCall);
      setTranscripts([]);
      setPartialTranscript(null);
      setLatestObjection(null);
      setLatestSuggestion(null);

      // Subscribe WebSocket to this call
      wsClient.subscribe(resp.callId);

      // Connect LiveKit audio
      await livekitSessionRef.current.connect(
        resp.livekitUrl,
        resp.agentToken,
        (state: LiveKitConnectionState) => {
          setIsMuted(state.isMuted);
          setAudioStatusText(state.statusText);
        },
        (speaker: 'agent' | 'customer', base64: string) => {
          wsClient.sendAudioChunk(resp.callId, speaker, base64);
        },
        (speaker: 'agent' | 'customer', text: string, isFinal: boolean) => {
          wsClient.sendSpeechTranscript(resp.callId, speaker, text, isFinal);
        }
      );

      setCurrentScreen('live-call');
    } catch (err: any) {
      alert(`Call initiation failed: ${err.message}`);
    } finally {
      setIsInitiating(false);
    }
  };

  // End Call
  const handleEndCall = async () => {
    if (!activeCall) return;

    try {
      const resp = await api.endCall(activeCall.id);
      livekitSessionRef.current.disconnect();
      wsClient.unsubscribe(activeCall.id);

      setActiveCall(null);
      setSelectedReport(resp.report);
      setCurrentScreen('reports');
      loadCalls();
    } catch (err: any) {
      alert(`Failed to end call: ${err.message}`);
    }
  };

  // Toggle Mute
  const handleToggleMute = async () => {
    const muted = await livekitSessionRef.current.toggleMute();
    setIsMuted(muted);
  };

  // Agent Feedback
  const handleFeedback = async (
    suggestionId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'EDITED',
    editedResponse?: string
  ) => {
    try {
      await api.submitFeedback(suggestionId, {
        status,
        editedResponse,
      });

      // Optimistically update
      setLatestSuggestion((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          feedbackStatus: status,
          editedResponse: editedResponse || prev.editedResponse,
        };
      });
    } catch (err: any) {
      console.error('Failed to submit suggestion feedback:', err);
    }
  };

  // Manual / Test statement
  const handleSendSimulationStatement = async (statement: string) => {
    if (!activeCall) return;
    try {
      await api.analyzeStatement(activeCall.id, statement, 'customer');
    } catch (err: any) {
      console.error('Error analyzing statement:', err);
    }
  };

  // View Report
  const handleViewReport = async (callId: string) => {
    setIsLoadingReport(true);
    setCurrentScreen('reports');
    try {
      const report = await api.getCallReport(callId);
      setSelectedReport(report);
    } catch (err) {
      console.warn('Could not load report for call', callId, err);
      setSelectedReport(null);
    } finally {
      setIsLoadingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      <Header
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
        activeCallId={activeCall?.id || null}
        isWsConnected={isWsConnected}
      />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4">
        {currentScreen === 'dashboard' && (
          <DashboardScreen
            onStartCall={handleStartCall}
            onViewReport={handleViewReport}
            recentCalls={callList}
            isInitiating={isInitiating}
          />
        )}

        {currentScreen === 'live-call' && (
          <LiveCallScreen
            currentCall={activeCall}
            transcripts={transcripts}
            partialTranscript={partialTranscript}
            latestObjection={latestObjection}
            latestSuggestion={latestSuggestion}
            isMuted={isMuted}
            audioStatusText={audioStatusText}
            onToggleMute={handleToggleMute}
            onEndCall={handleEndCall}
            onFeedback={handleFeedback}
            onSendSimulationStatement={handleSendSimulationStatement}
          />
        )}

        {currentScreen === 'reports' && (
          <CallReportsScreen
            report={selectedReport}
            callList={callList}
            onSelectCall={handleViewReport}
            isLoading={isLoadingReport}
          />
        )}
      </main>
    </div>
  );
}
