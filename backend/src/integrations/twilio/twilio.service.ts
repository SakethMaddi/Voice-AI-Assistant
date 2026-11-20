import twilio from 'twilio';
import { getTwilioClient } from './twilio.client.js';
import { env, isTwilioConfigured } from '../../utils/env.js';

export interface OutboundCallResult {
  callSid: string;
  status: string;
  isMock: boolean;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return phone;
  if (cleaned.startsWith('+')) return cleaned;
  // If 10 digits starting with 6-9 (Indian mobile), prepend +91
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  // If 12 digits starting with 91, prepend +
  if (/^91\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  // If 10 digits (US standard), prepend +1
  if (/^[2-9]\d{9}$/.test(cleaned)) {
    return `+1${cleaned}`;
  }
  return `+${cleaned}`;
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
    const formattedNumber = formatPhoneNumber(toPhoneNumber);

    if (client && isTwilioConfigured() && !env.MOCK_EXTERNAL_SERVICES) {
      try {
        const voiceWebhookUrl = `${env.BACKEND_URL}/api/webhooks/twilio/voice?callId=${callId}&room=${encodeURIComponent(livekitRoomId)}`;
        const statusWebhookUrl = `${env.BACKEND_URL}/api/webhooks/twilio/status?callId=${callId}`;

        let call;
        try {
          // Minimal parameters compatible with Twilio trial and upgraded accounts
          call = await client.calls.create({
            to: formattedNumber,
            from: env.TWILIO_PHONE_NUMBER,
            url: voiceWebhookUrl,
            statusCallback: statusWebhookUrl,
          });
        } catch (paramErr: any) {
          // If statusCallback or advanced parameter is rejected on trial account, retry with minimal {to, from, url}
          if (paramErr.message?.includes('disallowed parameters') || paramErr.message?.includes('trial accounts')) {
            console.warn('Twilio trial parameter restriction detected, retrying with minimal parameters...');
            call = await client.calls.create({
              to: formattedNumber,
              from: env.TWILIO_PHONE_NUMBER,
              url: voiceWebhookUrl,
            });
          } else {
            throw paramErr;
          }
        }

        return {
          callSid: call.sid,
          status: call.status,
          isMock: false,
        };
      } catch (err: any) {
        console.warn('Twilio outbound call initiation error:', err.message);

        // If trial account restricts unverified number, or trial limit reached, gracefully fall back to simulation mode
        if (
          err.message?.includes('trial accounts') ||
          err.message?.includes('unverified') ||
          err.message?.includes('21216') ||
          err.message?.includes('21217') ||
          err.message?.includes('disallowed')
        ) {
          const fallbackSid = `CA_trial_fallback_${callId}_${Math.random().toString(36).substring(2, 8)}`;
          console.log(`[TwilioService (Trial Fallback)] Falling back to simulated call for ${formattedNumber}: ${err.message}`);
          return {
            callSid: fallbackSid,
            status: 'queued',
            isMock: true,
          };
        }

        throw new Error(`Twilio call initiation failed: ${err.message}`);
      }
    }

    // Mock mode / local development
    const mockCallSid = `CA_mock_${callId}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(`[TwilioService (Mock)] Simulated outbound call to ${formattedNumber} with SID ${mockCallSid}`);

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
