import twilio from 'twilio';
import { getTwilioClient } from './twilio.client.js';
import { env, isTwilioConfigured } from '../../utils/env.js';

export interface OutboundCallResult {
  callSid: string;
  status: string;
  isMock: boolean;
}

export class TwilioService {
  /**
   * Initiate an outbound phone call via Twilio
   */
  async initiateCall(
    toPhoneNumber: string,
    callId: string,
    livekitRoomId: string
  ): Promise<OutboundCallResult> {
    const client = getTwilioClient();

    if (client && isTwilioConfigured() && !env.MOCK_EXTERNAL_SERVICES) {
      try {
        const voiceWebhookUrl = `${env.BACKEND_URL}/api/webhooks/twilio/voice?callId=${callId}&room=${encodeURIComponent(livekitRoomId)}`;
        const statusWebhookUrl = `${env.BACKEND_URL}/api/webhooks/twilio/status?callId=${callId}`;

        const call = await client.calls.create({
          to: toPhoneNumber,
          from: env.TWILIO_PHONE_NUMBER,
          url: voiceWebhookUrl,
          statusCallback: statusWebhookUrl,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST',
        });

        return {
          callSid: call.sid,
          status: call.status,
          isMock: false,
        };
      } catch (err: any) {
        console.error('Failed to initiate Twilio outbound call:', err);
        throw new Error(`Twilio call initiation failed: ${err.message}`);
      }
    }

    // Mock mode / local development
    const mockCallSid = `CA_mock_${callId}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(`[TwilioService (Mock)] Simulated outbound call to ${toPhoneNumber} with SID ${mockCallSid}`);

    return {
      callSid: mockCallSid,
      status: 'queued',
      isMock: true,
    };
  }

  /**
   * End an active call via Twilio
   */
  async endCall(twilioCallSid: string): Promise<boolean> {
    const client = getTwilioClient();

    if (client && isTwilioConfigured() && !env.MOCK_EXTERNAL_SERVICES && !twilioCallSid.startsWith('CA_mock_')) {
      try {
        await client.calls(twilioCallSid).update({ status: 'completed' });
        return true;
      } catch (err: any) {
        console.warn(`Error ending Twilio call ${twilioCallSid}:`, err.message);
        return false;
      }
    }

    console.log(`[TwilioService (Mock)] Call ${twilioCallSid} ended.`);
    return true;
  }

  /**
   * Generate TwiML connecting the Twilio voice call to LiveKit via SIP
   */
  generateVoiceTwiml(callId: string, livekitRoomId: string): string {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Legal consent & privacy announcement
    response.say(
      { voice: 'Polly.Joanna', language: 'en-US' },
      'Please note that this call is recorded and assisted in real time.'
    );

    // Extract LiveKit SIP domain from configuration
    let sipDomain = env.LIVEKIT_SIP_DOMAIN?.trim();
    if (!sipDomain) {
      let rawUri = env.LIVEKIT_SIP_URI.trim().replace(/^sip:/i, '');
      rawUri = rawUri.split('?')[0]; // Remove query params
      if (rawUri.includes('@')) {
        sipDomain = rawUri.split('@')[1];
      } else {
        sipDomain = rawUri;
      }
    }
    sipDomain = sipDomain.replace(/\/+$/, '') || 'sip.livekit.cloud';

    // Dynamic LiveKit room ID as SIP destination username for Callee dispatch rule
    const sipDestination = `sip:${encodeURIComponent(livekitRoomId)}@${sipDomain}`;
    const dial = response.dial();

    // Authenticated SIP attributes
    const sipAttributes: { username?: string; password?: string } = {};
    if (env.LIVEKIT_SIP_USERNAME) {
      sipAttributes.username = env.LIVEKIT_SIP_USERNAME;
    }
    if (env.LIVEKIT_SIP_PASSWORD) {
      sipAttributes.password = env.LIVEKIT_SIP_PASSWORD;
    }

    if (Object.keys(sipAttributes).length > 0) {
      dial.sip(sipAttributes, sipDestination);
    } else {
      dial.sip(sipDestination);
    }

    return response.toString();
  }
}

export const twilioService = new TwilioService();
