import { FastifyInstance } from 'fastify';
import { webhooksController } from './webhooks.controller.js';

export async function webhooksRoutes(fastify: FastifyInstance) {
  fastify.post('/twilio/voice', webhooksController.handleTwilioVoice.bind(webhooksController));
  fastify.post('/twilio/status', webhooksController.handleTwilioStatus.bind(webhooksController));
  fastify.post('/livekit', webhooksController.handleLiveKitWebhook.bind(webhooksController));
}
