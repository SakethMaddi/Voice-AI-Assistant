import { getDbClient } from '../plugins/prisma.js';

export interface ObjectionReportData {
  totalObjections: number;
  categoryBreakdown: Record<string, number>;
  objectionsList: Array<{
    id: string;
    category: string;
    customerStatement: string;
    sentiment: string;
    confidence: number;
    suggestions: Array<{
      id: string;
      primaryResponse: string;
      alternativeResponses: string[];
      rationale: string;
      feedbacks: Array<{
        status: string;
        editedResponse?: string | null;
        feedbackTimestamp: string;
      }>;
    }>;
  }>;
  totalAccepted: number;
  totalRejected: number;
  totalEdited: number;
}

export interface AgentPerformanceReviewData {
  objectionsFaced: number;
  objectionsHandledWithAI: number;
  suggestionsAccepted: number;
  suggestionsRejected: number;
  suggestionsEdited: number;
  acceptanceRatePercentage: number;
  callOutcome: string;
  notes: string;
}

export interface AIAccuracyReportData {
  objectionsDetected: number;
  suggestionsGenerated: number;
  suggestionsAccepted: number;
  suggestionsRejected: number;
  perceivedAccuracyRatePercentage: number;
  feedbackNotes: string[];
  disclaimer: string;
}

export interface GeneratedCallReport {
  id: string;
  callId: string;
  objectionReport: ObjectionReportData;
  agentPerformanceReport: AgentPerformanceReviewData;
  aiAccuracyReport: AIAccuracyReportData;
  createdAt: string;
}

export class ReportService {
  /**
   * Generate post-call summary report and store in database
   */
  async generateCallReport(callId: string): Promise<GeneratedCallReport> {
    const db = await getDbClient();

    // Check if report already exists for this call
    const existing = await db.callReport.findFirst({
      where: { callId },
    });

    if (existing) {
      return {
        id: existing.id,
        callId: existing.callId,
        objectionReport: typeof existing.objectionReport === 'string' ? JSON.parse(existing.objectionReport) : existing.objectionReport,
        agentPerformanceReport: typeof existing.agentPerformanceReport === 'string' ? JSON.parse(existing.agentPerformanceReport) : existing.agentPerformanceReport,
        aiAccuracyReport: typeof existing.aiAccuracyReport === 'string' ? JSON.parse(existing.aiAccuracyReport) : existing.aiAccuracyReport,
        createdAt: existing.createdAt.toISOString(),
      };
    }

    // Load full call hierarchy
    const call = await db.call.findUnique({
      where: { id: callId },
      include: {
        objections: {
          include: {
            suggestions: {
              include: {
                feedbacks: true,
              },
            },
          },
        },
      },
    });

    if (!call) {
      throw new Error(`Call ${callId} not found`);
    }

    const objections = call.objections || [];
    let totalSuggestions = 0;
    let totalAccepted = 0;
    let totalRejected = 0;
    let totalEdited = 0;
    const categoryBreakdown: Record<string, number> = {};
    const feedbackNotes: string[] = [];

    const objectionsList = objections.map((obj: any) => {
      categoryBreakdown[obj.category] = (categoryBreakdown[obj.category] || 0) + 1;

      const suggestions = (obj.suggestions || []).map((sug: any) => {
        totalSuggestions++;
        const alternatives =
          typeof sug.alternativeResponses === 'string'
            ? JSON.parse(sug.alternativeResponses || '[]')
            : sug.alternativeResponses;

        const feedbacks = (sug.feedbacks || []).map((fb: any) => {
          if (fb.status === 'ACCEPTED') totalAccepted++;
          if (fb.status === 'REJECTED') totalRejected++;
          if (fb.status === 'EDITED') totalEdited++;
          if (fb.notes) feedbackNotes.push(fb.notes);

          return {
            status: fb.status,
            editedResponse: fb.editedResponse,
            feedbackTimestamp: fb.feedbackTimestamp?.toISOString?.() || new Date().toISOString(),
          };
        });

        return {
          id: sug.id,
          primaryResponse: sug.primaryResponse,
          alternativeResponses: alternatives,
          rationale: sug.rationale,
          feedbacks,
        };
      });

      return {
        id: obj.id,
        category: obj.category,
        customerStatement: obj.customerStatement,
        sentiment: obj.sentiment,
        confidence: obj.confidence,
        suggestions,
      };
    });

    const totalHandled = totalAccepted + totalRejected + totalEdited;
    const acceptanceRate =
      totalHandled > 0 ? Math.round((totalAccepted / totalHandled) * 100) : 0;

    const objectionReportData: ObjectionReportData = {
      totalObjections: objections.length,
      categoryBreakdown,
      objectionsList,
      totalAccepted,
      totalRejected,
      totalEdited,
    };

    const agentPerformanceData: AgentPerformanceReviewData = {
      objectionsFaced: objections.length,
      objectionsHandledWithAI: totalHandled,
      suggestionsAccepted: totalAccepted,
      suggestionsRejected: totalRejected,
      suggestionsEdited: totalEdited,
      acceptanceRatePercentage: acceptanceRate,
      callOutcome: call.status === 'COMPLETED' ? 'Call completed successfully' : `Call ended with status ${call.status}`,
      notes: totalAccepted > 0 ? 'Agent utilized real-time AI guidance during customer objections.' : 'Agent handled conversation without selecting AI suggestions.',
    };

    const accuracyRate =
      totalSuggestions > 0
        ? Math.round(((totalAccepted + totalEdited) / totalSuggestions) * 100)
        : 100;

    const aiAccuracyData: AIAccuracyReportData = {
      objectionsDetected: objections.length,
      suggestionsGenerated: totalSuggestions,
      suggestionsAccepted: totalAccepted,
      suggestionsRejected: totalRejected,
      perceivedAccuracyRatePercentage: accuracyRate,
      feedbackNotes,
      disclaimer: 'Note: Suggestion acceptance or rejection indicates agent alignment with recommended wording and does not constitute guaranteed customer conversion.',
    };

    const savedReport = await db.callReport.create({
      data: {
        callId,
        objectionReport: JSON.stringify(objectionReportData),
        agentPerformanceReport: JSON.stringify(agentPerformanceData),
        aiAccuracyReport: JSON.stringify(aiAccuracyData),
      },
    });

    return {
      id: savedReport.id,
      callId,
      objectionReport: objectionReportData,
      agentPerformanceReport: agentPerformanceData,
      aiAccuracyReport: aiAccuracyData,
      createdAt: savedReport.createdAt.toISOString(),
    };
  }

  async getCallReport(callId: string): Promise<GeneratedCallReport | null> {
    const db = await getDbClient();
    const report = await db.callReport.findFirst({
      where: { callId },
    });

    if (!report) {
      // If call is finished, generate report on-demand
      const call = await db.call.findUnique({ where: { id: callId } });
      if (call && (call.status === 'COMPLETED' || call.status === 'FAILED' || call.status === 'NO_ANSWER')) {
        return this.generateCallReport(callId);
      }
      return null;
    }

    return {
      id: report.id,
      callId: report.callId,
      objectionReport: typeof report.objectionReport === 'string' ? JSON.parse(report.objectionReport) : report.objectionReport,
      agentPerformanceReport: typeof report.agentPerformanceReport === 'string' ? JSON.parse(report.agentPerformanceReport) : report.agentPerformanceReport,
      aiAccuracyReport: typeof report.aiAccuracyReport === 'string' ? JSON.parse(report.aiAccuracyReport) : report.aiAccuracyReport,
      createdAt: report.createdAt.toISOString(),
    };
  }
}

export const reportService = new ReportService();
