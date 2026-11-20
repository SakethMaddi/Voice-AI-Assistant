import { z } from 'zod';

export const InitiateCallSchema = z.object({
  customerPhoneNumber: z.string().min(5, 'Phone number must be at least 5 characters'),
  simulatedScenario: z.string().optional().default('standard'),
});

export type InitiateCallInput = z.infer<typeof InitiateCallSchema>;

export const EndCallSchema = z.object({
  callOutcome: z.string().optional().default('Normal call completion'),
});

export const AnalyzeObjectionInputSchema = z.object({
  callId: z.string(),
  customerStatement: z.string().min(1, 'Statement cannot be empty'),
  speaker: z.enum(['customer', 'agent']).default('customer'),
});

export const SuggestionFeedbackInputSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'EDITED']),
  editedResponse: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
