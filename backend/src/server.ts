import { buildApp } from './app.js';
import { env } from './utils/env.js';

async function startServer() {
  const app = buildApp();

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    console.log(`🚀 VoiceAI Assistant Server running at: ${address}`);
    console.log(`📡 WebSocket endpoint at: ws://${env.HOST === '0.0.0.0' ? 'localhost' : env.HOST}:${env.PORT}/ws`);
    console.log(`⚙️  Mode: ${env.MOCK_EXTERNAL_SERVICES ? 'MOCK / SIMULATION' : 'LIVE INTEGRATION'}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

startServer();
