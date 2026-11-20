import { FastifyInstance } from 'fastify';
import { objectionsController } from './objections.controller.js';

export async function objectionsRoutes(fastify: FastifyInstance) {
  fastify.post('/analyze', objectionsController.analyzeObjection.bind(objectionsController));
}
