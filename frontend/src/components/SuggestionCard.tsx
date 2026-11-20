import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Edit3,
  Lightbulb,
  MessageSquareQuote,
  ChevronRight,
} from 'lucide-react';
import { SuggestionItem } from '../types/call.js';

interface SuggestionCardProps {
  suggestion: SuggestionItem | null;
  onFeedback: (
    suggestionId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'EDITED',
    editedResponse?: string
  ) => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onFeedback,
}) => {
  const [selectedResponseIndex, setSelectedResponseIndex] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [copied, setCopied] = useState(false);

  if (!suggestion) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl text-center text-slate-500">
        <Sparkles className="h-10 w-10 mx-auto mb-2 text-slate-700 animate-pulse" />
        <h3 className="text-sm font-semibold text-slate-400">Awaiting Objection Context</h3>
        <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
          When the customer voices friction, AI will generate primary and alternative responses instantly.
        </p>
      </div>
    );
  }

  const responses = [
    { label: 'Primary Response', text: suggestion.primaryResponse, tag: 'Recommended' },
    { label: 'Alternative 1', text: suggestion.alternativeResponses[0] || '', tag: 'Option A' },
    { label: 'Alternative 2', text: suggestion.alternativeResponses[1] || '', tag: 'Option B' },
  ].filter((r) => Boolean(r.text));

  const activeResponseText = responses[selectedResponseIndex]?.text || suggestion.primaryResponse;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeResponseText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAccept = () => {
    onFeedback(suggestion.id, 'ACCEPTED');
  };

  const handleReject = () => {
    onFeedback(suggestion.id, 'REJECTED');
  };

  const handleSaveCustomEdit = () => {
    if (!customText.trim()) return;
    onFeedback(suggestion.id, 'EDITED', customText.trim());
    setIsEditing(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              AI Sales Guidance
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Recommended Responses
            </h3>
          </div>
        </div>

        {/* Feedback Badge if already marked */}
        {suggestion.feedbackStatus && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              suggestion.feedbackStatus === 'ACCEPTED'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : suggestion.feedbackStatus === 'REJECTED'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}
          >
            Marked as {suggestion.feedbackStatus}
          </span>
        )}
      </div>

      {/* Response Selector Tabs */}
      <div className="flex space-x-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-x-auto">
        {responses.map((resp, idx) => (
          <button
            key={idx}
            onClick={() => {
              setSelectedResponseIndex(idx);
              setIsEditing(false);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition text-center whitespace-nowrap flex items-center justify-center gap-1.5 ${
              selectedResponseIndex === idx && !isEditing
                ? 'bg-slate-800 text-white shadow border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{resp.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded ${
                idx === 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {resp.tag}
            </span>
          </button>
        ))}
        <button
          onClick={() => {
            setCustomText(activeResponseText);
            setIsEditing(true);
          }}
          className={`py-1.5 px-3 rounded-lg text-xs font-medium transition text-center whitespace-nowrap flex items-center justify-center gap-1 ${
            isEditing
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Custom Edit</span>
        </button>
      </div>

      {/* Response Content Display */}
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Type your tailored response here..."
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCustomEdit}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow"
            >
              Submit Edited Response
            </button>
          </div>
        </div>
      ) : (
        <div className="relative group bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-start space-x-2 text-slate-100 text-sm leading-relaxed">
            <MessageSquareQuote className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{activeResponseText}</p>
          </div>

          <div className="mt-3 flex items-center justify-end space-x-2 pt-2 border-t border-slate-800/80">
            <button
              onClick={handleCopy}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1.5 border border-slate-700"
              title="Copy to clipboard"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Response'}</span>
            </button>

            <button
              onClick={handleAccept}
              disabled={suggestion.feedbackStatus === 'ACCEPTED'}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1.5 font-semibold disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Accept</span>
            </button>

            <button
              onClick={handleReject}
              disabled={suggestion.feedbackStatus === 'REJECTED'}
              className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition flex items-center gap-1.5 font-semibold disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5 text-rose-400" />
              <span>Reject</span>
            </button>
          </div>
        </div>
      )}

      {/* Rationale & Approach Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
            Recommended Approach
          </div>
          <p className="text-slate-400 leading-relaxed">{suggestion.rationale}</p>
        </div>

        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
            <ChevronRight className="h-3.5 w-3.5 text-teal-400" />
            Customer Sentiment Context
          </div>
          <p className="text-slate-400 leading-relaxed">{suggestion.sentimentAnalysis}</p>
        </div>
      </div>
    </div>
  );
};
