import React from 'react';
import { PhoneCall, Activity, BarChart3, Radio } from 'lucide-react';

interface HeaderProps {
  currentScreen: 'dashboard' | 'live-call' | 'reports';
  onNavigate: (screen: 'dashboard' | 'live-call' | 'reports') => void;
  activeCallId: string | null;
  isWsConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  activeCallId,
  isWsConnected,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Radio className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              VoiceAI
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Objection Assistant
              </span>
            </h1>
            <p className="text-xs text-slate-400">Real-Time In-Call Sales Intelligence</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              currentScreen === 'dashboard'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <PhoneCall className="h-4 w-4" />
            Dashboard
          </button>

          {activeCallId && (
            <button
              onClick={() => onNavigate('live-call')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                currentScreen === 'live-call'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-emerald-400 hover:bg-emerald-950/40'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Call
            </button>
          )}

          <button
            onClick={() => onNavigate('reports')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              currentScreen === 'reports'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Call Reports
          </button>
        </nav>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2 text-xs">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isWsConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-amber-500 animate-pulse'
            }`}
          />
          <span className="hidden sm:inline text-slate-400">
            {isWsConnected ? 'Real-Time Sync Active' : 'Connecting Sync...'}
          </span>
        </div>
      </div>
    </header>
  );
};
