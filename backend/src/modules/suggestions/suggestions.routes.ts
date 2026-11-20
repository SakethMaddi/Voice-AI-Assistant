import { FastifyInstance } from 'fastify';
import { suggestionsController } from './suggestions.controller.js';

export async function suggestionsRoutes(fastify: FastifyInstance) {
  fastify.post('/:id/feedback', suggestionsController.recordFeedback.bind(suggestionsController));
}
