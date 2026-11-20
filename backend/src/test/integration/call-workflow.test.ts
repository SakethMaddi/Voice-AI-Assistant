import { describe, it, expect } from 'vitest';
import { buildApp } from '../../app.js';
import { transcriptionService } from '../../services/transcription.service.js';
import { getDbClient } from '../../plugins/prisma.js';

describe('End-to-End Call Workflow (Integration)', () => {
  const app = buildApp();

  it('executes the full lifecycle: initiate -> transcribe -> detect -> suggest -> feedback -> end -> report', async () => {
    // 1. Sales rep initiates call
    const initiateRes = await app.inject({
      method: 'POST',
      url: '/api/calls/initiate',
      payload: {
        customerPhoneNumber: '+15559876543',
        simulatedScenario: 'pricing',
      },
    });

    expect(initiateRes.statusCode).toBe(201);
    const callData = JSON.parse(initiateRes.body);
    expect(callData.callId).toBeTruthy();
    expect(callData.livekitRoomId).toBeTruthy();
    expect(callData.agentToken).toBeTruthy();
    expect(callData.customerPhoneNumber).toBe('+15559876543');

    const callId = callData.callId;

    // 2. Transcription received: Customer voices objection
    await transcriptionService.recordTranscript(
      callId,
      'agent',
      'Hello, thank you for taking my call today.',
      true
    );

    await transcriptionService.recordTranscript(
      callId,
      'customer',
      'Honestly, your solution is way too expensive for our current budget.',
      true
    );

    // Wait a brief moment for async objection & suggestion tasks
    await new Promise((r) => setTimeout(r, 100));

    // 3. Verify objection was stored
    const db = await getDbClient();
    const objections = await db.objection.findMany({
      where: { callId },
      include: { suggestions: true },
    });

    expect(objections.length).toBeGreaterThanOrEqual(1);
    const obj = objections[0];
    expect(obj.category).toBe('Pricing or budget concerns');
    expect(obj.suggestions.length).toBeGreaterThanOrEqual(1);

    const suggestion = obj.suggestions[0];
    expect(suggestion.primaryResponse).toBeTruthy();

    // 4. Agent interacts with suggestion: records feedback (ACCEPTED)
    const feedbackRes = await app.inject({
      method: 'POST',
      url: `/api/suggestions/${suggestion.id}/feedback`,
      payload: {
        status: 'ACCEPTED',
        notes: 'Helpful objection counter',
      },
    });

    expect(feedbackRes.statusCode).toBe(201);

    // 5. End call
    const endRes = await app.inject({
      method: 'POST',
      url: `/api/calls/${callId}/end`,
      payload: {
        callOutcome: 'Demo scheduled next Tuesday',
      },
    });

    expect(endRes.statusCode).toBe(200);
    const endData = JSON.parse(endRes.body);
    expect(endData.success).toBe(true);
    expect(endData.report).toBeTruthy();
    expect(endData.report.objectionReport.totalAccepted).toBe(1);

    // 6. Retrieve post-call report from GET endpoint
    const getReportRes = await app.inject({
      method: 'GET',
      url: `/api/calls/${callId}/report`,
    });

    expect(getReportRes.statusCode).toBe(200);
    const reportData = JSON.parse(getReportRes.body);
    expect(reportData.objectionReport.totalObjections).toBeGreaterThanOrEqual(1);
    expect(reportData.agentPerformanceReport.acceptanceRatePercentage).toBe(100);
  });
});
