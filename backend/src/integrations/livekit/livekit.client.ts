import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { env, isLiveKitConfigured } from '../../utils/env.js';

let roomServiceClient: RoomServiceClient | null = null;

export function getLiveKitRoomService(): RoomServiceClient | null {
  if (roomServiceClient) return roomServiceClient;

  if (isLiveKitConfigured()) {
    try {
      roomServiceClient = new RoomServiceClient(
        env.LIVEKIT_URL,
        env.LIVEKIT_API_KEY,
        env.LIVEKIT_API_SECRET
      );
      return roomServiceClient;
    } catch (err) {
      console.error('Failed to initialize LiveKit RoomServiceClient:', err);
    }
  }

  return null;
}

export interface TokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName?: string;
  isAgent?: boolean;
}

export async function generateLiveKitToken(options: TokenOptions): Promise<string> {
  // If LiveKit credentials exist, generate genuine signed JWT token
  const apiKey = env.LIVEKIT_API_KEY || 'devkey';
  const apiSecret = env.LIVEKIT_API_SECRET || 'secret';

  const at = new AccessToken(apiKey, apiSecret, {
    identity: options.participantIdentity,
    name: options.participantName || options.participantIdentity,
  });

  at.addGrant({
    roomJoin: true,
    room: options.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}
