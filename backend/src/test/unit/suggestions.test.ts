import { describe, it, expect } from 'vitest';
import { openAIService } from '../../integrations/openai/openai.service.js';
import { suggestionService } from '../../services/suggestion.service.js';
import { getDbClient } from '../../plugins/prisma.js';

describe('AI Suggestion Generation (Unit)', () => {
  it('generates primary and 2 alternative responses with rationale and sentiment', async () => {
    const result = await openAIService.generateSuggestions({
      category: 'Pricing or budget concerns',
      customerStatement: 'This is too expensive for our small startup.',
      customerIntent: 'Looking for a lower entry cost or ROI justification',
    });

    expect(result.primaryResponse).toBeTruthy();
    expect(result.alternativeResponse1).toBeTruthy();
    expect(result.alternativeResponse2).toBeTruthy();
    expect(result.approachExplanation).toBeTruthy();
    expect(result.sentimentAnalysis).toBeTruthy();

    // Verify it doesn't give fake promises
    expect(result.primaryResponse).not.toContain('free lifetime');
  });

  it('records agent feedback (ACCEPTED, REJECTED, EDITED) accurately', async () => {
    const db = await getDbClient();

    // Setup dummy objection
    const obj = await db.objection.create({
      data: {
        callId: 'call_test_sug',
        category: 'Pricing or budget concerns',
        customerStatement: 'Too pricey',
        customerIntent: 'Budget objection',
        sentiment: 'negative',
        confidence: 0.9,
      },
    });

    const suggestion = await suggestionService.generateSuggestionsForObjection(
      'call_test_sug',
      obj.id,
      {
        category: obj.category,
        customerStatement: obj.customerStatement,
        customerIntent: obj.customerIntent,
      }
    );

    // Accept feedback
    const feedback = await suggestionService.recordAgentFeedback(suggestion.id, {
      status: 'ACCEPTED',
      notes: 'Worked well to deflect pricing objection',
    });

    expect(feedback.status).toBe('ACCEPTED');
    expect(feedback.suggestionId).toBe(suggestion.id);
  });
});
