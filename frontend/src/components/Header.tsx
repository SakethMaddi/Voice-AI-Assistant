import React, { useState } from 'react';
import { PhoneCall, BarChart3, Radio, Settings, Server, Check, X } from 'lucide-react';
import { getBackendBaseUrl, setBackendBaseUrl } from '../utils/config.js';
import { websocketService } from '../services/websocket.js';

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
  const [showSettings, setShowSettings] = useState(false);
  const [backendInput, setBackendInput] = useState(getBackendBaseUrl());
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveBackend = (e: React.FormEvent) => {
    e.preventDefault();
    setBackendBaseUrl(backendInput);
    websocketService.forceReconnect();
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowSettings(false);
    }, 1200);
  };

  return (
    <>
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

          {/* Status Indicator & Settings Trigger */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center space-x-2 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-800/40 hover:bg-slate-800 transition cursor-pointer"
            title="Click to configure Backend API & WebSocket server"
          >
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                isWsConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="hidden sm:inline text-slate-300 font-medium">
              {isWsConnected ? 'Real-Time Sync Active' : 'Connecting Sync...'}
            </span>
            <Settings className="h-3.5 w-3.5 text-slate-400 ml-1" />
          </button>
        </div>
      </header>

      {/* Backend Connection Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Backend Connection Settings</h3>
                <p className="text-xs text-slate-400">Configure your deployed Render backend URL</p>
              </div>
            </div>

            <form onSubmit={handleSaveBackend} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Render Backend URL
                </label>
                <input
                  type="url"
                  placeholder="https://voice-ai-backend.onrender.com"
                  value={backendInput}
                  onChange={(e) => setBackendInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Paste the public URL from your Render dashboard (e.g. <code className="text-slate-400">https://voice-ai-backend-xxxx.onrender.com</code>).
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="h-4 w-4" />
                      Saved & Reconnected!
                    </>
                  ) : (
                    'Save & Connect'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
