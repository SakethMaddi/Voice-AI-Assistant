import twilio from 'twilio';
import { env, isTwilioConfigured } from '../../utils/env.js';

let twilioRestClient: twilio.Twilio | null = null;

export function getTwilioClient(): twilio.Twilio | null {
  if (twilioRestClient) return twilioRestClient;

  if (isTwilioConfigured()) {
    try {
      twilioRestClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      return twilioRestClient;
    } catch (err) {
      console.error('Failed to initialize Twilio client:', err);
    }
  }

  return null;
}

export function validateTwilioWebhookSignature(
  signature: string | undefined,
  url: string,
  params: Record<string, any>
): boolean {
  if (!isTwilioConfigured() || env.MOCK_EXTERNAL_SERVICES) {
    // In mock or test mode, accept request if signature is mock-valid or in development
    return true;
  }

  if (!signature) {
    return false;
  }

  try {
    return twilio.validateRequest(
      env.TWILIO_AUTH_TOKEN,
      signature,
      url,
      params
    );
  } catch (err) {
    console.error('Twilio signature validation error:', err);
    return false;
  }
}
