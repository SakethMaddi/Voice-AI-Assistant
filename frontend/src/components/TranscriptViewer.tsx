import React, { useRef, useEffect, useState } from 'react';
import { User, Headphones, Send, Sparkles } from 'lucide-react';
import { TranscriptItem } from '../types/call.js';

interface TranscriptViewerProps {
  transcripts: TranscriptItem[];
  partialTranscript: TranscriptItem | null;
  onSendSimulationStatement?: (text: string) => void;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  transcripts,
  partialTranscript,
  onSendSimulationStatement,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  // Auto-scroll to bottom on new transcripts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, partialTranscript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !onSendSimulationStatement) return;
    onSendSimulationStatement(inputText.trim());
    setInputText('');
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[520px] shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Headphones className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Live Conversation Transcript</h2>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
          OpenAI Whisper STT
        </span>
      </div>

      {/* Transcript Body */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
        {transcripts.length === 0 && !partialTranscript ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-sm">
            <Sparkles className="h-8 w-8 text-slate-600 mb-2 animate-pulse" />
            <p>Listening for speech...</p>
            <p className="text-xs text-slate-600 mt-1">
              Audio is transcribed in real-time as words are spoken.
            </p>
          </div>
        ) : (
          <>
            {transcripts.map((t) => {
              const isAgent = t.speaker === 'agent';
              return (
                <div
                  key={t.id}
                  className={`flex items-start space-x-3 ${
                    isAgent ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow ${
                      isAgent
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                        : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {isAgent ? 'You' : <User className="h-4 w-4" />}
                  </div>

                  <div className={`max-w-[75%] ${isAgent ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-semibold text-slate-300">
                        {isAgent ? 'Sales Representative' : 'Customer'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatTimestamp(t.timestamp)}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-2xl text-sm leading-relaxed ${
                        isAgent
                          ? 'bg-blue-600/10 border border-blue-500/20 text-blue-100 rounded-tr-none'
                          : 'bg-slate-800/90 border border-slate-700/60 text-slate-100 rounded-tl-none'
                      }`}
                    >
                      {t.text}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Partial / In-flight transcription segment */}
            {partialTranscript && (
              <div
                className={`flex items-start space-x-3 opacity-80 ${
                  partialTranscript.speaker === 'agent' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-xs text-slate-400">
                  ...
                </div>
                <div className="max-w-[75%]">
                  <div className="p-3 rounded-2xl text-sm italic bg-slate-800/40 border border-slate-700/30 text-slate-400 flex items-center gap-2">
                    <span>{partialTranscript.text}</span>
                    <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Simulator / Test Input bar */}
      {onSendSimulationStatement && (
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Simulate customer speech / objection statement..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send</span>
          </button>
        </form>
      )}
    </div>
  );
};
