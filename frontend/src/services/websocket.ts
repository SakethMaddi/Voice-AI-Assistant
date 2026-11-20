import { getWebSocketUrl } from '../utils/config.js';

export type WebSocketEventHandler = (event: string, data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Set<WebSocketEventHandler> = new Set();
  private subscribedCallId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: any = null;
  private isExplicitlyClosed = false;

  connect() {
    this.isExplicitlyClosed = false;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = getWebSocketUrl();

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected to backend');
        this.reconnectAttempts = 0;
        if (this.subscribedCallId) {
          this.subscribe(this.subscribedCallId);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.notifyHandlers(payload.event, payload.data || payload);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.ws.onclose = () => {
        console.warn('⚠️ WebSocket disconnected');
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        this.ws?.close();
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  subscribe(callId: string) {
    this.subscribedCallId = callId;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'subscribe', callId }));
    }
  }

  sendAudioChunk(callId: string, speaker: 'agent' | 'customer', audioBase64: string, isFinal = true) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'audio_chunk',
        callId,
        speaker,
        audioBase64,
        isFinal,
      }));
    }
  }

  sendSpeechTranscript(callId: string, speaker: 'agent' | 'customer', text: string, isFinal = true) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'speech_transcript',
        callId,
        speaker,
        text,
        isFinal,
      }));
    }
  }

  unsubscribe(callId: string) {
    if (this.subscribedCallId === callId) {
      this.subscribedCallId = null;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'unsubscribe', callId }));
    }
  }

  onEvent(handler: WebSocketEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  private notifyHandlers(event: string, data: any) {
    for (const handler of this.handlers) {
      try {
        handler(event, data);
      } catch (err) {
        console.error('Error in WS handler:', err);
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max WebSocket reconnect attempts reached.');
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting WebSocket reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  forceReconnect() {
    if (this.ws) {
      this.isExplicitlyClosed = true;
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.reconnectAttempts = 0;
    this.connect();
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();
export const websocketService = wsClient;
