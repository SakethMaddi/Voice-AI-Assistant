import { describe, it, expect } from 'vitest';
import { buildApp } from '../../app.js';
import { twilioService } from '../../integrations/twilio/twilio.service.js';
import { env, envSchema, isLiveKitSipAuthConfigured } from '../../utils/env.js';

describe('Webhooks & Twilio Integration (Unit)', () => {
  const app = buildApp();

  it('generates valid TwiML with SIP dial to LiveKit using Callee dispatch rule', () => {
    const twiml = twilioService.generateVoiceTwiml('call_123', 'room_call_123');
    expect(twiml).toContain('<Response>');
    expect(twiml).toContain('<Dial>');
    expect(twiml).toContain('<Sip');
    // Destination username is dynamic LiveKit room ID
    expect(twiml).toContain('sip:room_call_123@');
    expect(twiml).toContain('@sip.livekit.cloud');
  });

  it('generates authenticated SIP element when credentials are configured', () => {
    const originalUser = env.LIVEKIT_SIP_USERNAME;
    const originalPass = env.LIVEKIT_SIP_PASSWORD;

    env.LIVEKIT_SIP_USERNAME = 'test_sip_user';
    env.LIVEKIT_SIP_PASSWORD = 'test_sip_password';

    const twiml = twilioService.generateVoiceTwiml('call_auth_1', 'room_dynamic_999');

    expect(twiml).toContain('username="test_sip_user"');
    expect(twiml).toContain('password="test_sip_password"');
    expect(twiml).toContain('sip:room_dynamic_999@');
    expect(twiml).toContain('@sip.livekit.cloud');

    // Restore
    env.LIVEKIT_SIP_USERNAME = originalUser;
    env.LIVEKIT_SIP_PASSWORD = originalPass;
  });

  it('generates unauthenticated SIP element when credentials are not configured', () => {
    const originalUser = env.LIVEKIT_SIP_USERNAME;
    const originalPass = env.LIVEKIT_SIP_PASSWORD;

    env.LIVEKIT_SIP_USERNAME = '';
    env.LIVEKIT_SIP_PASSWORD = '';

    const twiml = twilioService.generateVoiceTwiml('call_unauth', 'room_dynamic_000');

    expect(twiml).not.toContain('username=');
    expect(twiml).not.toContain('password=');
    expect(twiml).toContain('<Sip>sip:room_dynamic_000@');

    // Restore
    env.LIVEKIT_SIP_USERNAME = originalUser;
    env.LIVEKIT_SIP_PASSWORD = originalPass;
  });

  it('uses explicitly configured LIVEKIT_SIP_DOMAIN for SIP destination', () => {
    const originalDomain = env.LIVEKIT_SIP_DOMAIN;

    env.LIVEKIT_SIP_DOMAIN = 'custom-sip.livekit.cloud';
    const twiml = twilioService.generateVoiceTwiml('call_custom_domain', 'room_custom_domain');

    expect(twiml).toContain('sip:room_custom_domain@custom-sip.livekit.cloud');

    // Restore
    env.LIVEKIT_SIP_DOMAIN = originalDomain;
  });

  it('validates LIVEKIT_SIP_USERNAME, LIVEKIT_SIP_PASSWORD, and isLiveKitSipAuthConfigured', () => {
    // Schema validation with empty/default values
    const defaultParsed = envSchema.safeParse({});
    expect(defaultParsed.success).toBe(true);
    if (defaultParsed.success) {
      expect(defaultParsed.data.LIVEKIT_SIP_USERNAME).toBe('');
      expect(defaultParsed.data.LIVEKIT_SIP_PASSWORD).toBe('');
      expect(defaultParsed.data.LIVEKIT_SIP_DOMAIN).toBe('');
    }

    // Schema validation with provided credentials
    const authParsed = envSchema.safeParse({
      LIVEKIT_SIP_USERNAME: 'sip_user_test',
      LIVEKIT_SIP_PASSWORD: 'sip_pass_test',
      LIVEKIT_SIP_DOMAIN: 'sip.example.com',
    });
    expect(authParsed.success).toBe(true);
    if (authParsed.success) {
      expect(authParsed.data.LIVEKIT_SIP_USERNAME).toBe('sip_user_test');
      expect(authParsed.data.LIVEKIT_SIP_PASSWORD).toBe('sip_pass_test');
      expect(authParsed.data.LIVEKIT_SIP_DOMAIN).toBe('sip.example.com');
    }

    // Helper function verification
    const originalUser = env.LIVEKIT_SIP_USERNAME;
    const originalPass = env.LIVEKIT_SIP_PASSWORD;

    env.LIVEKIT_SIP_USERNAME = 'user_abc';
    env.LIVEKIT_SIP_PASSWORD = 'pass_xyz';
    expect(isLiveKitSipAuthConfigured()).toBe(true);

    env.LIVEKIT_SIP_USERNAME = '';
    expect(isLiveKitSipAuthConfigured()).toBe(false);

    // Restore
    env.LIVEKIT_SIP_USERNAME = originalUser;
    env.LIVEKIT_SIP_PASSWORD = originalPass;
  });

  it('responds with TwiML XML on POST /api/webhooks/twilio/voice without credentials', async () => {
    const originalUser = env.LIVEKIT_SIP_USERNAME;
    const originalPass = env.LIVEKIT_SIP_PASSWORD;
    env.LIVEKIT_SIP_USERNAME = '';
    env.LIVEKIT_SIP_PASSWORD = '';

    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/twilio/voice?callId=test_1&room=room_test_1',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      payload: 'CallSid=CA_test_voice&From=%2B15551234567',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/xml');
    expect(res.body).toContain('<Dial>');
    expect(res.body).toContain('<Sip>sip:room_test_1@');

    env.LIVEKIT_SIP_USERNAME = originalUser;
    env.LIVEKIT_SIP_PASSWORD = originalPass;
  });

  it('responds with authenticated TwiML XML on POST /api/webhooks/twilio/voice when credentials are configured', async () => {
    const originalUser = env.LIVEKIT_SIP_USERNAME;
    const originalPass = env.LIVEKIT_SIP_PASSWORD;
    env.LIVEKIT_SIP_USERNAME = 'webhook_sip_user';
    env.LIVEKIT_SIP_PASSWORD = 'webhook_sip_pass';

    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/twilio/voice?callId=test_auth&room=room_auth_webhook',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      payload: 'CallSid=CA_test_voice_auth&From=%2B15551234567',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/xml');
    expect(res.body).toContain('<Dial>');
    expect(res.body).toContain('username="webhook_sip_user"');
    expect(res.body).toContain('password="webhook_sip_pass"');
    expect(res.body).toContain('sip:room_auth_webhook@');

    env.LIVEKIT_SIP_USERNAME = originalUser;
    env.LIVEKIT_SIP_PASSWORD = originalPass;
  });

  it('handles Twilio call status updates idempotently and without crashing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/twilio/status?callId=nonexistent_call',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      payload: 'CallSid=CA_test_status&CallStatus=ringing',
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.status).toBe('call_not_found_ignored');
  });
});
