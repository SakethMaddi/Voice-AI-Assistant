import React from 'react';
import { AlertCircle, Target, TrendingDown, TrendingUp, Minus, ShieldAlert } from 'lucide-react';
import { ObjectionItem } from '../types/call.js';

interface ObjectionCardProps {
  objection: ObjectionItem | null;
}

export const ObjectionCard: React.FC<ObjectionCardProps> = ({ objection }) => {
  if (!objection) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-center text-slate-500">
        <ShieldAlert className="h-10 w-10 mx-auto mb-2 text-slate-700" />
        <h3 className="text-sm font-semibold text-slate-400">No Objections Detected</h3>
        <p className="text-xs text-slate-600 mt-1">
          OpenAI is actively listening to customer speech to detect friction and objections.
        </p>
      </div>
    );
  }

  const confidencePct = Math.round(objection.confidence * 100);

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'negative':
        return (
          <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <TrendingDown className="h-3 w-3" />
            Negative Friction
          </span>
        );
      case 'positive':
        return (
          <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="h-3 w-3" />
            Positive
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Minus className="h-3 w-3" />
            Neutral Inquiry
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Category & Confidence */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
              Detected Objection
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {objection.category}
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {getSentimentBadge(objection.sentiment)}
          <div className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            Confidence: <span className="text-emerald-400 font-bold">{confidencePct}%</span>
          </div>
        </div>
      </div>

      {/* Customer Statement */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 italic">
        "{objection.customerStatement}"
      </div>

      {/* Customer Intent */}
      <div className="flex items-start space-x-2 text-xs text-slate-400 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
        <Target className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-300">Underlying Intent: </span>
          {objection.customerIntent}
        </div>
      </div>
    </div>
  );
};
