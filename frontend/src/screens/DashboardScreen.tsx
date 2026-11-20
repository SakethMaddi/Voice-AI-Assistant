import React, { useState } from 'react';
import { Phone, PhoneForwarded, History, Clock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { CallRecord } from '../types/call.js';

interface DashboardScreenProps {
  onStartCall: (phoneNumber: string, scenario?: string) => void;
  onViewReport: (callId: string) => void;
  recentCalls: CallRecord[];
  isInitiating: boolean;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onStartCall,
  onViewReport,
  recentCalls,
  isInitiating,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('+1 (555) 234-5678');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || isInitiating) return;
    onStartCall(phoneNumber.trim(), 'standard');
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Hero / Call Initiation Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Real-Time Voice Assistance</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Initiate Customer Call
          </h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Connect directly via browser telephony. OpenAI Whisper transcribes both speakers and analyzes objections in real-time with sub-second response recommendations.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Customer Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Twilio SIP Trunking & LiveKit WebRTC Enabled</span>
              </div>

              <button
                type="submit"
                disabled={isInitiating}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {isInitiating ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <PhoneForwarded className="h-4 w-4" />
                    <span>Start Live Call</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Recent Calls Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white font-bold text-lg">
            <History className="h-5 w-5 text-emerald-400" />
            <span>Recent Calls & Performance</span>
          </div>
          <span className="text-xs text-slate-400">
            {recentCalls.length} previous calls logged
          </span>
        </div>

        {recentCalls.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">
            <Clock className="h-10 w-10 mx-auto mb-2 text-slate-700" />
            <p className="font-medium text-slate-400">No calls initiated yet</p>
            <p className="text-xs text-slate-600 mt-1">
              Start your first call above to view real-time transcription and objection handling.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentCalls.map((call) => (
              <div
                key={call.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-lg transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {call.status}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {formatDuration(call.duration)}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white tracking-wide">
                    {call.customerPhoneNumber}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDate(call.createdAt)}
                  </p>

                  <div className="mt-3 flex items-center space-x-3 text-xs text-slate-400">
                    <span>
                      Objections: <strong className="text-slate-200">{call.objections?.length || 0}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Transcripts: <strong className="text-slate-200">{call.transcripts?.length || 0}</strong>
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-end">
                  <button
                    onClick={() => onViewReport(call.id)}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
                  >
                    <span>View Post-Call Report</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
