import { z } from 'zod';

export const OBJECTION_CATEGORIES = [
  'Pricing or budget concerns',
  'Already using another provider',
  'Lack of interest',
  'Lack of trust',
  'Product limitations',
  'Timing concerns',
  'Competitor comparison',
  'Other objections',
] as const;

export type ObjectionCategory = (typeof OBJECTION_CATEGORIES)[number];

export const ObjectionDetectionSchema = z.object({
  objectionDetected: z.boolean(),
  objectionCategory: z.enum(OBJECTION_CATEGORIES).nullable(),
  customerStatement: z.string().nullable(),
  customerIntent: z.string().nullable(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).default('neutral'),
  confidenceScore: z.number().min(0).max(1).default(0),
});

export type ObjectionDetectionResult = z.infer<typeof ObjectionDetectionSchema>;

export const SuggestionResponseSchema = z.object({
  primaryResponse: z.string().min(1),
  alternativeResponse1: z.string().min(1),
  alternativeResponse2: z.string().min(1),
  sentimentAnalysis: z.string().min(1),
  approachExplanation: z.string().min(1),
});

export type SuggestionResponseResult = z.infer<typeof SuggestionResponseSchema>;
