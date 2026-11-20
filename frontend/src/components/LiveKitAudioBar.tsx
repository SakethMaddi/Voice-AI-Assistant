import React from 'react';
import { Mic, MicOff, PhoneOff, Radio, Volume2 } from 'lucide-react';
import { CallTimer } from './CallTimer.js';

interface LiveKitAudioBarProps {
  customerPhoneNumber: string;
  startTime?: string | null;
  callStatus: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  audioStatusText: string;
}

export const LiveKitAudioBar: React.FC<LiveKitAudioBarProps> = ({
  customerPhoneNumber,
  startTime,
  callStatus,
  isMuted,
  onToggleMute,
  onEndCall,
  audioStatusText,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center space-x-4">
        <div className="h-11 w-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
          <Volume2 className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Customer
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {callStatus}
            </span>
          </div>
          <div className="text-lg font-bold text-white tracking-wide">
            {customerPhoneNumber}
          </div>
        </div>
      </div>

      {/* Audio Status & Waveform */}
      <div className="flex items-center space-x-3 bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800/80">
        <div className="flex items-center space-x-1">
          <span className="h-3 w-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="h-5 w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="h-4 w-1 bg-teal-400 rounded-full animate-bounce"></span>
          <span className="h-2 w-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
        </div>
        <div className="text-xs">
          <div className="font-medium text-slate-200 flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-emerald-400" />
            Live Audio Channel
          </div>
          <div className="text-slate-400 text-[11px] truncate max-w-[200px]">
            {audioStatusText}
          </div>
        </div>
      </div>

      {/* Controls: Timer, Mute, End Call */}
      <div className="flex items-center space-x-3">
        <CallTimer startTime={startTime} isActive={callStatus !== 'COMPLETED'} />

        <button
          onClick={onToggleMute}
          className={`p-2.5 rounded-xl border transition flex items-center gap-2 text-sm font-medium ${
            isMuted
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
              : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? (
            <>
              <MicOff className="h-4 w-4" />
              <span className="hidden sm:inline">Unmute</span>
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">Mute</span>
            </>
          )}
        </button>

        <button
          onClick={onEndCall}
          className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-2 text-sm active:scale-95"
        >
          <PhoneOff className="h-4 w-4" />
          End Call
        </button>
      </div>
    </div>
  );
};
