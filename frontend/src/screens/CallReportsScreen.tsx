import React, { useState } from 'react';
import {
  BarChart3,
  CheckCircle,
  XCircle,
  Edit,
  ShieldCheck,
  AlertTriangle,
  FileText,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import { CallRecord, CallReportData } from '../types/call.js';

interface CallReportsScreenProps {
  report: CallReportData | null;
  callList: CallRecord[];
  onSelectCall: (callId: string) => void;
  isLoading: boolean;
}

export const CallReportsScreen: React.FC<CallReportsScreenProps> = ({
  report,
  callList,
  onSelectCall,
  isLoading,
}) => {
  const [selectedCallId, setSelectedCallId] = useState<string>(report?.callId || '');

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCallId(val);
    if (val) {
      onSelectCall(val);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-emerald-400" />
            Post-Call Analytics & Reports
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Comprehensive post-call objection breakdown, agent interaction metrics, and AI model evaluation.
          </p>
        </div>

        {/* Call Selector */}
        <div className="relative min-w-[260px]">
          <select
            value={report?.callId || selectedCallId}
            onChange={handleSelectChange}
            className="w-full appearance-none bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 pr-9"
          >
            <option value="">Select a previous call...</option>
            {callList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customerPhoneNumber} ({new Date(c.createdAt).toLocaleDateString()}) - {c.status}
              </option>
            ))}
          </select>
          <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading call analytics report...</p>
        </div>
      ) : !report ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-slate-700" />
          <h3 className="text-base font-semibold text-slate-400">No Report Selected</h3>
          <p className="text-xs text-slate-600 mt-1">
            Select a completed call from the dropdown above or initiate a call from the dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: KPI Stats Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
              <div className="text-xs font-medium text-slate-400">Objections Detected</div>
              <div className="text-2xl font-black text-white mt-1">
                {report.objectionReport.totalObjections}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
              <div className="text-xs font-medium text-slate-400">Suggestions Accepted</div>
              <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                {report.objectionReport.totalAccepted}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
              <div className="text-xs font-medium text-slate-400">Suggestions Rejected</div>
              <div className="text-2xl font-black text-rose-400 mt-1 flex items-center gap-1.5">
                <XCircle className="h-5 w-5 text-rose-400" />
                {report.objectionReport.totalRejected}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
              <div className="text-xs font-medium text-slate-400">Custom Edited Responses</div>
              <div className="text-2xl font-black text-blue-400 mt-1 flex items-center gap-1.5">
                <Edit className="h-5 w-5 text-blue-400" />
                {report.objectionReport.totalEdited}
              </div>
            </div>
          </div>

          {/* Section 2: Objection Report Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Objection Report
              </h3>
              <span className="text-xs text-slate-400">
                Total: {report.objectionReport.totalObjections} categorized objections
              </span>
            </div>

            {/* Category Breakdown Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(report.objectionReport.categoryBreakdown).map(([category, count]) => (
                <div
                  key={category}
                  className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2"
                >
                  <span className="text-slate-300 font-medium">{category}</span>
                  <span className="bg-slate-800 text-emerald-400 font-mono px-1.5 py-0.2 rounded font-bold">
                    {count}
                  </span>
                </div>
              ))}
            </div>

            {/* Detailed Objection and Suggestion List */}
            <div className="space-y-3 pt-2">
              {report.objectionReport.objectionsList.map((obj, i) => (
                <div
                  key={obj.id || i}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {obj.category}
                    </span>
                    <span className="text-slate-400">
                      Confidence: {Math.round(obj.confidence * 100)}%
                    </span>
                  </div>

                  <p className="text-sm text-slate-200 italic bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    "{obj.customerStatement}"
                  </p>

                  {/* Associated Suggestions & Feedback */}
                  {obj.suggestions.map((sug) => (
                    <div key={sug.id} className="text-xs space-y-2 pt-1 border-t border-slate-800/60">
                      <div>
                        <span className="text-slate-400 font-medium">Primary Suggestion: </span>
                        <span className="text-slate-300">{sug.primaryResponse}</span>
                      </div>

                      {sug.feedbacks && sug.feedbacks.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-500 font-medium">Rep Feedback:</span>
                          {sug.feedbacks.map((fb, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded font-semibold ${
                                fb.status === 'ACCEPTED'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : fb.status === 'REJECTED'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {fb.status} {fb.editedResponse ? `("${fb.editedResponse}")` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Agent Performance Review & AI Accuracy Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agent Performance Review */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <UserCheck className="h-4 w-4 text-blue-400" />
                Agent Performance Review
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Objections Handled:</span>
                  <span className="font-bold text-white font-mono">
                    {report.agentPerformanceReport.objectionsHandledWithAI}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Suggestions Accepted:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {report.agentPerformanceReport.suggestionsAccepted}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Suggestions Rejected:</span>
                  <span className="font-bold text-rose-400 font-mono">
                    {report.agentPerformanceReport.suggestionsRejected}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Suggestion Acceptance Rate:</span>
                  <span className="font-bold text-white font-mono">
                    {report.agentPerformanceReport.acceptanceRatePercentage}%
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-slate-400 font-semibold block mb-1">Call Outcome:</span>
                  <p className="bg-slate-950 p-2.5 rounded-lg text-slate-300 border border-slate-800">
                    {report.agentPerformanceReport.callOutcome}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Accuracy Report */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                AI Accuracy & Reliability Report
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Objections Detected by AI:</span>
                  <span className="font-bold text-white font-mono">
                    {report.aiAccuracyReport.objectionsDetected}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Suggestions Generated:</span>
                  <span className="font-bold text-white font-mono">
                    {report.aiAccuracyReport.suggestionsGenerated}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Perceived AI Accuracy:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {report.aiAccuracyReport.perceivedAccuracyRatePercentage}%
                  </span>
                </div>

                {report.aiAccuracyReport.feedbackNotes?.length > 0 && (
                  <div className="pt-2">
                    <span className="text-slate-400 font-semibold block mb-1">Agent Feedback Notes:</span>
                    <ul className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800 list-disc list-inside text-slate-300">
                      {report.aiAccuracyReport.feedbackNotes.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Important Disclaimer Required By Section 2.I */}
                <div className="pt-2">
                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/90 text-[11px] text-slate-400 leading-relaxed italic">
                    {report.aiAccuracyReport.disclaimer}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
