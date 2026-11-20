import { getLiveKitRoomService, generateLiveKitToken } from './livekit.client.js';
import { env, isLiveKitConfigured } from '../../utils/env.js';

export interface RoomDetails {
  roomName: string;
  isMock: boolean;
  livekitUrl: string;
}

export class LiveKitService {
  /**
   * Create a new LiveKit room for a call
   */
  async createRoom(roomName: string): Promise<RoomDetails> {
    const roomService = getLiveKitRoomService();

    if (roomService && isLiveKitConfigured() && !env.MOCK_EXTERNAL_SERVICES) {
      try {
        await roomService.createRoom({
          name: roomName,
          emptyTimeout: 300, // 5 min
          maxParticipants: 10,
        });
        return {
          roomName,
          isMock: false,
          livekitUrl: env.LIVEKIT_URL,
        };
      } catch (err: any) {
        // Room might already exist
        if (!err.message?.includes('already exists')) {
          console.error(`LiveKit room creation failed:`, err);
          throw new Error(`Failed to create LiveKit room: ${err.message}`);
        }
      }
    }

    console.log(`[LiveKitService (Mock)] Created simulated room: ${roomName}`);
    return {
      roomName,
      isMock: true,
      livekitUrl: env.LIVEKIT_URL,
    };
  }

  /**
   * Generate token for the sales rep to connect from browser
   */
  async generateAgentToken(roomName: string, agentId = 'sales_rep'): Promise<string> {
    return await generateLiveKitToken({
      roomName,
      participantIdentity: agentId,
      participantName: 'Sales Representative',
      isAgent: true,
    });
  }

  /**
   * Generate token for the customer (SIP participant or web test)
   */
  async generateCustomerToken(roomName: string, customerId = 'customer'): Promise<string> {
    return await generateLiveKitToken({
      roomName,
      participantIdentity: customerId,
      participantName: 'Customer',
      isAgent: false,
    });
  }

  /**
   * Clean up and close room after call ends
   */
  async cleanupRoom(roomName: string): Promise<void> {
    const roomService = getLiveKitRoomService();

    if (roomService && isLiveKitConfigured() && !env.MOCK_EXTERNAL_SERVICES) {
      try {
        await roomService.deleteRoom(roomName);
        console.log(`[LiveKitService] Deleted room ${roomName}`);
      } catch (err: any) {
        console.warn(`[LiveKitService] Warning cleaning up room ${roomName}:`, err.message);
      }
    } else {
      console.log(`[LiveKitService (Mock)] Cleaned up room ${roomName}`);
    }
  }
}

export const livekitService = new LiveKitService();
