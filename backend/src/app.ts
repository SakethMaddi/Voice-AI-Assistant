import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import websocket from '@fastify/websocket';
import { websocketPlugin } from './plugins/websocket.js';
import { callsRoutes } from './modules/calls/calls.routes.js';
import { objectionsRoutes } from './modules/objections/objections.routes.js';
import { suggestionsRoutes } from './modules/suggestions/suggestions.routes.js';
import { webhooksRoutes } from './modules/webhooks/webhooks.routes.js';
import { env } from './utils/env.js';

export function buildApp(): FastifyInstance {
  const app = fastify({
    logger: false,
  });

  // Middleware plugins
  app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.register(formbody);
  app.register(websocket);
  app.register(websocketPlugin);

  // Health check endpoint
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    mockMode: env.MOCK_EXTERNAL_SERVICES,
  }));

  // Application Routes
  app.register(callsRoutes, { prefix: '/api/calls' });
  app.register(objectionsRoutes, { prefix: '/api/objections' });
  app.register(suggestionsRoutes, { prefix: '/api/suggestions' });
  app.register(webhooksRoutes, { prefix: '/api/webhooks' });

  // Global Error Handler
  app.setErrorHandler((error, request, reply) => {
    console.error('Fastify request error:', error);
    const err = error as Error & { statusCode?: number };
    const statusCode = err.statusCode || 500;
    return reply.status(statusCode).send({
      error: err.name || 'InternalServerError',
      message: err.message || 'An unexpected error occurred',
      statusCode,
    });
  });

  return app;
}
