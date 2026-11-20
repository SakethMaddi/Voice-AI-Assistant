import { describe, it, expect } from 'vitest';
import { reportService } from '../../services/report.service.js';
import { getDbClient } from '../../plugins/prisma.js';
import { suggestionService } from '../../services/suggestion.service.js';

describe('Call Report Generation (Unit)', () => {
  it('generates an Objection Report, Agent Performance Review, and AI Accuracy Report', async () => {
    const db = await getDbClient();

    // Setup dummy call
    const call = await db.call.create({
      data: {
        id: 'call_rep_test',
        customerPhoneNumber: '+15551234567',
        livekitRoomId: 'room_call_rep_test',
        status: 'COMPLETED',
        startTime: new Date(Date.now() - 120000), // 2 min ago
        endTime: new Date(),
        duration: 120,
      },
    });

    // Create an objection
    const obj = await db.objection.create({
      data: {
        callId: call.id,
        category: 'Pricing or budget concerns',
        customerStatement: 'It is too expensive',
        customerIntent: 'Negotiation',
        sentiment: 'negative',
        confidence: 0.95,
      },
    });

    // Create suggestion
    const sug = await suggestionService.generateSuggestionsForObjection(
      call.id,
      obj.id,
      {
        category: obj.category,
        customerStatement: obj.customerStatement,
        customerIntent: obj.customerIntent,
      }
    );

    // Record agent feedback
    await suggestionService.recordAgentFeedback(sug.id, {
      status: 'ACCEPTED',
      notes: 'Good suggestion',
    });

    const report = await reportService.generateCallReport(call.id);

    expect(report).toBeTruthy();
    expect(report.callId).toBe(call.id);

    // Objection report checks
    expect(report.objectionReport.totalObjections).toBe(1);
    expect(report.objectionReport.categoryBreakdown['Pricing or budget concerns']).toBe(1);
    expect(report.objectionReport.totalAccepted).toBe(1);

    // Agent performance review checks
    expect(report.agentPerformanceReport.objectionsHandledWithAI).toBe(1);
    expect(report.agentPerformanceReport.suggestionsAccepted).toBe(1);
    expect(report.agentPerformanceReport.acceptanceRatePercentage).toBe(100);

    // AI Accuracy report checks
    expect(report.aiAccuracyReport.objectionsDetected).toBe(1);
    expect(report.aiAccuracyReport.disclaimer).toContain('does not constitute guaranteed customer conversion');
  });
});
