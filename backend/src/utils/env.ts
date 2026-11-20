import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/voice_ai_assistant?schema=public'),
  PORT: z.coerce.number().default(5001),
  HOST: z.string().default('0.0.0.0'),
  TWILIO_ACCOUNT_SID: z.string().default('AC_placeholder'),
  TWILIO_AUTH_TOKEN: z.string().default('placeholder'),
  TWILIO_PHONE_NUMBER: z.string().default('+15551234567'),
  LIVEKIT_URL: z.string().default('https://mock-livekit.livekit.cloud'),
  LIVEKIT_API_KEY: z.string().default('devkey'),
  LIVEKIT_API_SECRET: z.string().default('secret'),
  LIVEKIT_SIP_URI: z.string().default('sip:voiceai@sip.livekit.cloud'),
  LIVEKIT_SIP_USERNAME: z.string().optional().default(''),
  LIVEKIT_SIP_PASSWORD: z.string().optional().default(''),
  LIVEKIT_SIP_DOMAIN: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().default('sk-placeholder'),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  BACKEND_URL: z.string().default('http://localhost:5001'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  MOCK_EXTERNAL_SERVICES: z.preprocess(
    (val) => val === 'true' || val === true || val === '1',
    z.boolean().default(true)
  ),
  NODE_ENV: z.string().default('development'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Environment validation failed:', parsedEnv.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsedEnv.data;

export const isTwilioConfigured = () =>
  Boolean(env.TWILIO_ACCOUNT_SID && !env.TWILIO_ACCOUNT_SID.includes('placeholder') && env.TWILIO_AUTH_TOKEN && !env.TWILIO_AUTH_TOKEN.includes('placeholder'));

export const isLiveKitConfigured = () =>
  Boolean(env.LIVEKIT_URL && !env.LIVEKIT_URL.includes('mock') && env.LIVEKIT_API_KEY !== 'devkey');

export const isLiveKitSipAuthConfigured = () =>
  Boolean(env.LIVEKIT_SIP_USERNAME && env.LIVEKIT_SIP_PASSWORD);

export const isOpenAIConfigured = () =>
  Boolean(env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes('placeholder'));
