import { FastifyInstance } from 'fastify';
import { callsController } from './calls.controller.js';

export async function callsRoutes(fastify: FastifyInstance) {
  fastify.post('/initiate', callsController.initiateCall.bind(callsController));
  fastify.post('/:id/end', callsController.endCall.bind(callsController));
  fastify.post('/:id/audio', callsController.processAudioChunk.bind(callsController));
  fastify.get('/:id', callsController.getCall.bind(callsController));
  fastify.get('/', callsController.listCalls.bind(callsController));
  fastify.get('/:id/transcript', callsController.getCallTranscript.bind(callsController));
  fastify.get('/:id/report', callsController.getCallReport.bind(callsController));
}
