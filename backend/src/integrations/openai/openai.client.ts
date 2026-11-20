import OpenAI from 'openai';
import { env, isOpenAIConfigured } from '../../utils/env.js';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  if (openaiClient) return openaiClient;

  if (isOpenAIConfigured()) {
    try {
      openaiClient = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
      return openaiClient;
    } catch (err) {
      console.error('Failed to initialize OpenAI client:', err);
    }
  }

  return null;
}
