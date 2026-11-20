import { describe, it, expect } from 'vitest';
import { openAIService } from '../../integrations/openai/openai.service.js';
import { objectionService } from '../../services/objection.service.js';

describe('AI Objection Detection (Unit)', () => {
  it('accurately detects "Pricing or budget concerns" objection', async () => {
    const result = await openAIService.detectObjection(
      "Your quote is completely out of our price range for this quarter's budget."
    );

    expect(result.objectionDetected).toBe(true);
    expect(result.objectionCategory).toBe('Pricing or budget concerns');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.7);
    expect(result.sentiment).toBe('negative');
  });

  it('accurately detects "Already using another provider" objection', async () => {
    const result = await openAIService.detectObjection(
      "We already have a contract with Salesforce and have been using them for years."
    );

    expect(result.objectionDetected).toBe(true);
    expect(result.objectionCategory).toBe('Already using another provider');
  });

  it('accurately detects "Timing concerns" objection', async () => {
    const result = await openAIService.detectObjection(
      "We are too busy with our migration right now, call us back next quarter."
    );

    expect(result.objectionDetected).toBe(true);
    expect(result.objectionCategory).toBe('Timing concerns');
  });

  it('accurately detects "Competitor comparison" objection', async () => {
    const result = await openAIService.detectObjection(
      "How do you compare to Hubspot? They offer a very similar feature set."
    );

    expect(result.objectionDetected).toBe(true);
    expect(result.objectionCategory).toBe('Competitor comparison');
  });

  it('returns objectionDetected: false for positive or non-objection statement', async () => {
    const result = await openAIService.detectObjection(
      "That sounds wonderful, let's schedule the product demonstration for tomorrow."
    );

    expect(result.objectionDetected).toBe(false);
  });
});
