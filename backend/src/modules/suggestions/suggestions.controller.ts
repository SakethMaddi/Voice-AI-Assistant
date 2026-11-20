import { FastifyRequest, FastifyReply } from 'fastify';
import { SuggestionFeedbackInputSchema } from '../../schemas/calls.schema.js';
import { suggestionService } from '../../services/suggestion.service.js';

export class SuggestionsController {
  async recordFeedback(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = req.params;
    const parseResult = SuggestionFeedbackInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    try {
      const feedback = await suggestionService.recordAgentFeedback(id, parseResult.data);
      return reply.status(201).send({
        success: true,
        feedback,
      });
    } catch (err: any) {
      return reply.status(404).send({
        error: err.message || 'Failed to record feedback',
      });
    }
  }
}

export const suggestionsController = new SuggestionsController();
