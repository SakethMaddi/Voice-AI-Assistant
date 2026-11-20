import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { BaseWSEvent, WebSocketEventType } from '../utils/events.js';

interface SubscribedClient {
  ws: WebSocket;
  callIds: Set<string>;
  isAlive: boolean;
}

class WebSocketManager {
  private clients: Set<SubscribedClient> = new Set();
  private processedEventIds: Set<string> = new Set();

  registerClient(ws: WebSocket) {
    const client: SubscribedClient = {
      ws,
      callIds: new Set<string>(),
      isAlive: true,
    };

    this.clients.add(client);

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (message: string | Buffer) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.action === 'subscribe' && payload.callId) {
          client.callIds.add(payload.callId);
          ws.send(JSON.stringify({
            event: 'subscribed',
            callId: payload.callId,
            timestamp: new Date().toISOString(),
          }));
        } else if (payload.action === 'unsubscribe' && payload.callId) {
          client.callIds.delete(payload.callId);
        } else if (payload.action === 'ping') {
          ws.send(JSON.stringify({ action: 'pong', timestamp: new Date().toISOString() }));
        } else if (payload.action === 'speech_transcript' && payload.callId && payload.text) {
          import('../services/transcription.service.js').then(({ transcriptionService }) => {
            transcriptionService.recordTranscript(
              payload.callId,
              payload.speaker || 'agent',
              payload.text,
              payload.isFinal ?? true
            ).catch((e) => console.error('WS speech transcript error:', e));
          });
        } else if (payload.action === 'audio_chunk' && payload.callId && payload.audioBase64) {
          const buffer = Buffer.from(payload.audioBase64, 'base64');
          import('../services/transcription.service.js').then(({ transcriptionService }) => {
            transcriptionService.processAudioBuffer(
              payload.callId,
              payload.speaker || 'customer',
              buffer,
              payload.isFinal ?? true
            ).catch((e) => console.error('WS audio chunk error:', e));
          });
        }
      } catch (err) {
        console.error('Failed to parse incoming WS message:', err);
      }
    });

    ws.on('close', () => {
      this.clients.delete(client);
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
      this.clients.delete(client);
    });
  }

  broadcast<T>(event: WebSocketEventType, callId: string, data: T, eventKey?: string) {
    // Duplicate prevention
    const dedupeKey = eventKey || `${event}:${callId}:${JSON.stringify(data).slice(0, 40)}`;
    if (this.processedEventIds.has(dedupeKey)) {
      return;
    }
    this.processedEventIds.add(dedupeKey);
    // Cleanup old keys after 5 minutes
    if (this.processedEventIds.size > 2000) {
      this.processedEventIds.clear();
    }

    const payload: BaseWSEvent<T> = {
      event,
      callId,
      timestamp: new Date().toISOString(),
      data,
    };

    const message = JSON.stringify(payload);

    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Send if client subscribed to this callId OR if client has no specific filters (global dashboard)
        if (client.callIds.size === 0 || client.callIds.has(callId)) {
          try {
            client.ws.send(message);
          } catch (err) {
            console.error('Error sending WS message to client:', err);
          }
        }
      }
    }
  }

  startHeartbeat() {
    setInterval(() => {
      for (const client of this.clients) {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(client);
          continue;
        }
        client.isAlive = false;
        try {
          client.ws.ping();
        } catch {
          this.clients.delete(client);
        }
      }
    }, 30000);
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();

export async function websocketPlugin(fastify: FastifyInstance) {
  wsManager.startHeartbeat();

  fastify.get('/ws', { websocket: true }, (socket, req) => {
    wsManager.registerClient(socket);
  });
}
