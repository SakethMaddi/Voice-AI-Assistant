import { describe, it, expect } from 'vitest';
import { generateLiveKitToken } from '../../integrations/livekit/livekit.client.js';
import { livekitService } from '../../integrations/livekit/livekit.service.js';

describe('LiveKit Integration (Unit)', () => {
  it('generates a valid LiveKit JWT access token for an agent', async () => {
    const token = await livekitService.generateAgentToken('test_room', 'rep_123');
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // Standard JWT 3 parts
  });

  it('generates a valid LiveKit token for customer', async () => {
    const token = await livekitService.generateCustomerToken('test_room', 'customer_123');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  });

  it('creates and cleans up a room in mock/dev mode without throwing', async () => {
    const room = await livekitService.createRoom('test_room_alpha');
    expect(room.roomName).toBe('test_room_alpha');

    await expect(livekitService.cleanupRoom('test_room_alpha')).resolves.not.toThrow();
  });
});
