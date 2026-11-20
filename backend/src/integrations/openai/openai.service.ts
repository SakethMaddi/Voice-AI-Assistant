import OpenAI from 'openai';
import { getOpenAIClient } from './openai.client.js';
import { env, isOpenAIConfigured } from '../../utils/env.js';
import {
  ObjectionCategory,
  ObjectionDetectionResult,
  ObjectionDetectionSchema,
  SuggestionResponseResult,
  SuggestionResponseSchema,
  OBJECTION_CATEGORIES,
} from '../../schemas/objections.schema.js';

export class OpenAIService {
  /**
   * Transcribe audio buffer using OpenAI Whisper or mock transcription
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    filename = 'audio.webm',
    speaker: 'agent' | 'customer' = 'customer'
  ): Promise<string> {
    const client = getOpenAIClient();

    if (client && isOpenAIConfigured() && !env.MOCK_EXTERNAL_SERVICES) {
      try {
        const file = await OpenAI.toFile(audioBuffer, filename, { type: 'audio/webm' });
        const transcription = await client.audio.transcriptions.create({
          file: file,
          model: 'whisper-1',
          language: 'en',
        });
        return transcription.text;
      } catch (err: any) {
        console.error('OpenAI Whisper transcription failed:', err);
        // Fall back gracefully rather than crashing
        return '';
      }
    }

    // Mock transcription fallback depending on speaker
    if (speaker === 'agent') {
      return ''; // Agent speech is captured live via browser SpeechRecognition or real Whisper
    }
    return 'Thank you for calling. Can you tell me more about your pricing options? It seems quite expensive for our current quarterly budget.';
  }

  /**
   * Detect objections from conversation statement & context
   */
  async detectObjection(
    latestCustomerStatement: string,
    contextHistory: { speaker: string; text: string }[] = []
  ): Promise<ObjectionDetectionResult> {
    const client = getOpenAIClient();

    if (client && isOpenAIConfigured() && !env.MOCK_EXTERNAL_SERVICES) {
      try {
        const prompt = `You are a real-time sales call objection detection engine.
Analyze the following latest customer statement in the context of the recent conversation history.

Recent context:
${contextHistory.map((m) => `${m.speaker}: "${m.text}"`).join('\n')}

Latest customer statement: "${latestCustomerStatement}"

Categories of objections to detect:
1. "Pricing or budget concerns"
2. "Already using another provider"
3. "Lack of interest"
4. "Lack of trust"
5. "Product limitations"
6. "Timing concerns"
7. "Competitor comparison"
8. "Other objections"

Return JSON with exact keys:
{
  "objectionDetected": boolean,
  "objectionCategory": string or null (must strictly match one of the 8 category names listed above),
  "customerStatement": string or null,
  "customerIntent": string or null,
  "sentiment": "positive" | "neutral" | "negative",
  "confidenceScore": number between 0.0 and 1.0
}`;

        const response = await client.chat.completions.create({
          model: env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert sales intelligence assistant. You must respond strictly with valid JSON conforming to the requested schema.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const validated = ObjectionDetectionSchema.safeParse(parsed);
          if (validated.success) {
            return validated.data;
          }
          console.warn('OpenAI objection response failed validation:', validated.error);
        }
      } catch (err: any) {
        console.error('OpenAI objection analysis error:', err.message);
      }
    }

    // Heuristic / Mock detection when external OpenAI is unavailable or in mock mode
    return this.mockDetectObjection(latestCustomerStatement);
  }

  /**
   * Generate contextual response suggestions for a detected objection
   */
  async generateSuggestions(
    objection: {
      category: ObjectionCategory | string;
      customerStatement: string;
      customerIntent: string;
    },
    contextHistory: { speaker: string; text: string }[] = []
  ): Promise<SuggestionResponseResult> {
    const client = getOpenAIClient();

    if (client && isOpenAIConfigured() && !env.MOCK_EXTERNAL_SERVICES) {
      try {
        const prompt = `You are an AI sales coach providing real-time objection-handling suggestions to a sales representative during a live phone call.

Objection Category: "${objection.category}"
Customer Statement: "${objection.customerStatement}"
Customer Intent: "${objection.customerIntent}"

Recent conversation:
${contextHistory.map((m) => `${m.speaker}: "${m.text}"`).join('\n')}

Guidelines:
- Provide 1 primary response and 2 alternative responses.
- Suggestions must be contextual, empathetic, and professional.
- DO NOT make false product claims, invented discounts, or guarantees.
- Include a concise sentiment analysis of the customer's mindset.
- Include a short explanation of the recommended approach.

Return valid JSON with:
{
  "primaryResponse": "...",
  "alternativeResponse1": "...",
  "alternativeResponse2": "...",
  "sentimentAnalysis": "...",
  "approachExplanation": "..."
}`;

        const response = await client.chat.completions.create({
          model: env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a top-tier B2B sales coaching assistant. Output only valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const validated = SuggestionResponseSchema.safeParse(parsed);
          if (validated.success) {
            return validated.data;
          }
        }
      } catch (err: any) {
        console.error('OpenAI suggestion generation error:', err.message);
      }
    }

    // Realistic Mock / Rule-based Suggestions
    return this.mockGenerateSuggestions(objection);
  }

  private mockDetectObjection(text: string): ObjectionDetectionResult {
    const lower = text.toLowerCase();

    if (lower.includes('expensive') || lower.includes('cost') || lower.includes('price') || lower.includes('budget') || lower.includes('afford')) {
      return {
        objectionDetected: true,
        objectionCategory: 'Pricing or budget concerns',
        customerStatement: text,
        customerIntent: 'The customer feels the cost is high or not budgeted for this fiscal cycle.',
        sentiment: 'negative',
        confidenceScore: 0.92,
      };
    }

    if (lower.includes('already use') || lower.includes('already have') || lower.includes('current vendor') || lower.includes('current provider') || lower.includes('another provider') || lower.includes('contract with') || lower.includes('switching')) {
      return {
        objectionDetected: true,
        objectionCategory: 'Already using another provider',
        customerStatement: text,
        customerIntent: 'Customer is concerned about switching headaches, workflow disruption, and implementation effort.',
        sentiment: 'neutral',
        confidenceScore: 0.89,
      };
    }

    if (lower.includes('competitor') || lower.includes('vs') || lower.includes('compare') || lower.includes('alternative') || lower.includes('better than')) {
      return {
        objectionDetected: true,
        objectionCategory: 'Competitor comparison',
        customerStatement: text,
        customerIntent: 'The customer is comparing features or value against a direct market alternative.',
        sentiment: 'neutral',
        confidenceScore: 0.86,
      };
    }

    if (lower.includes('not interested') || lower.includes('don\'t need') || lower.includes('no thanks') || lower.includes('happy as is')) {
      return {
        objectionDetected: true,
        objectionCategory: 'Lack of interest',
        customerStatement: text,
        customerIntent: 'The customer does not see immediate relevance or value in continuing the discussion.',
        sentiment: 'negative',
        confidenceScore: 0.95,
      };
    }

    if (lower.includes('never heard') || lower.includes('reviews') || lower.includes('reliable') || lower.includes('security') || lower.includes('reputation')) {
      return {
        objectionDetected: true,
        objectionCategory: 'Lack of trust',
        customerStatement: text,
        customerIntent: 'The customer is cautious about vendor credibility, stability, or track record.',
        sentiment: 'negative',
        confidenceScore: 0.84,
      };
    }

    if (lower.includes('not right now') || lower.includes('next quarter') || lower.includes('busy') || lower.includes('call back later') || lower.includes('timing')) {
      return {
        objectionDetected: true,
        objectionCategory: 'Timing concerns',
        customerStatement: text,
        customerIntent: 'The customer sees potential value but prioritizes other concurrent projects.',
        sentiment: 'neutral',
        confidenceScore: 0.88,
      };
    }

    if (lower.includes('missing feature') || lower.includes('can\'t do') || lower.includes('integrate with') || lower.includes('limitation') || lower.includes('doesn\'t support')) {
      return {
        objectionDetected: true,
        objectionCategory: 'Product limitations',
        customerStatement: text,
        customerIntent: 'The customer is concerned about technical compatibility or capability gaps.',
        sentiment: 'negative',
        confidenceScore: 0.87,
      };
    }

    // Default if customer speech exhibits general friction
    if (lower.includes('problem') || lower.includes('issue') || lower.includes('hesitant') || lower.includes('doubt')) {
      return {
        objectionDetected: true,
        objectionCategory: 'Other objections',
        customerStatement: text,
        customerIntent: 'The customer is expressing hesitation or friction.',
        sentiment: 'neutral',
        confidenceScore: 0.72,
      };
    }

    return {
      objectionDetected: false,
      objectionCategory: null,
      customerStatement: null,
      customerIntent: null,
      sentiment: 'neutral',
      confidenceScore: 0,
    };
  }

  private mockGenerateSuggestions(objection: {
    category: string;
    customerStatement: string;
    customerIntent: string;
  }): SuggestionResponseResult {
    switch (objection.category) {
      case 'Pricing or budget concerns':
        return {
          primaryResponse: "That makes sense. Is the main constraint this quarter's timing, or is the expected return still unclear? I can tailor a smaller next step around what is realistic now.",
          alternativeResponse1: "Price is always an important consideration. To make sure we're evaluating this properly, could you share what metrics or ROI your leadership team evaluates when reviewing technology investments?",
          alternativeResponse2: "Understood. Rather than looking at the full suite today, would it make sense to explore our core package that addresses your immediate bottleneck?",
          sentimentAnalysis: "The customer is cautious regarding cost allocation and requires clear ROI justification before proceeding.",
          approachExplanation: "Acknowledge the budget reality, clarify whether timing or return is the blocker, and propose low-risk scoping.",
        };
      case 'Already using another provider':
        return {
          primaryResponse: "Understandable—changing providers takes effort. What is working well today, and where do you still see friction? We can compare options without assuming a switch is right, ensuring sensible co-sight.",
          alternativeResponse1: "Understood. If you don't mind me asking, when does your renewal come up, and are there any features your team frequently asks for that aren't available today?",
          alternativeResponse2: "Respect that completely. Would it hurt to see a brief 10-minute side-by-side comparison so you have a benchmark ready whenever you evaluate the market next?",
          sentimentAnalysis: "Customer values stability and resists change unless clear superiority or coexistence is demonstrated.",
          approachExplanation: "Validate their current vendor choice, reduce threat by avoiding aggressive replacement talk, and uncover friction points.",
        };
      case 'Lack of interest':
        return {
          primaryResponse: "I appreciate you being direct with me. Before I let you go, could I ask if improving call resolution speed and sales conversion is on your roadmap for this year, or is your focus elsewhere?",
          alternativeResponse1: "Fair enough! If timing isn't right, I don't want to take up your time. May I send over a 1-page case study from a team in your sector so you have it for future reference?",
          alternativeResponse2: "Totally get it. What would have to change in your day-to-day operations for this to become a priority?",
          sentimentAnalysis: "Customer is defensive or dismissive; needs quick, respectful value question rather than a pushy pitch.",
          approachExplanation: "Respect their time, ask one targeted qualifying question, and gracefully leave the door open.",
        };
      case 'Lack of trust':
        return {
          primaryResponse: "That is completely reasonable—vetting new partners is critical. We work with rigorous enterprise security standards including SOC2 and GDPR compliance. Would you like to review our customer reference list and security documentation?",
          alternativeResponse1: "I understand your caution. Would it help if I connected you with one of our customers in a similar role so you can hear directly about their experience?",
          alternativeResponse2: "Trust is earned through results. How about we run a small pilot with zero commitment so your team can verify the capabilities firsthand?",
          sentimentAnalysis: "Risk-averse; needs social proof, compliance certifications, and transparent peer references.",
          approachExplanation: "Provide transparent third-party validation, enterprise certifications, or a zero-risk pilot.",
        };
      case 'Product limitations':
        return {
          primaryResponse: "Thank you for highlighting that requirement. Integration and workflow compatibility are essential. Let's look at our open API and webhooks—several clients connected their stack in under an afternoon. What is the specific system you need linked?",
          alternativeResponse1: "That is a great question. While that specific button isn't built-in, our platform supports automated webhook triggers that achieve the exact same workflow without custom coding.",
          alternativeResponse2: "I want to be fully transparent about our roadmap. Let me verify the exact timeline for that capability with our engineering team so you have accurate information.",
          sentimentAnalysis: "Customer is technically focused and needs honest capability assessment without false promises.",
          approachExplanation: "Never make false product promises; validate their technical workflow and discuss real integration options.",
        };
      case 'Timing concerns':
        return {
          primaryResponse: "Understood, timing is everything with new initiatives. Given that implementation usually takes 2-3 weeks, many teams start the discovery process now so they're fully operational when their peak season arrives. When would be ideal for you to see results?",
          alternativeResponse1: "Makes total sense. What major milestones or projects is your team concentrating on between now and then?",
          alternativeResponse2: "Let's pause here and reconnect when things settle. What week in next month works best for a quick 10-minute check-in?",
          sentimentAnalysis: "Customer is overwhelmed with current projects; needs low-friction planning without pressure.",
          approachExplanation: "Work backwards from their desired go-live timeline while respecting their current workload.",
        };
      case 'Competitor comparison':
        return {
          primaryResponse: "They have built a reputable tool, and we respect them. Where our customers see the biggest difference is in our sub-second real-time AI latency and deep native telephony integration. Have you tested both for live response latency?",
          alternativeResponse1: "Good choice to compare. Often customers tell us they switched because of our simpler setup and faster support turnaround. What specific criteria matter most to your team?",
          alternativeResponse2: "They are strong in general reporting, whereas our core focus is real-time in-call objection assistance for live reps. Let's look at how that difference impacts your close rates.",
          sentimentAnalysis: "Customer is actively evaluating options and looking for distinct differentiators.",
          approachExplanation: "Praise the competitor respectfully while steering to your unique strengths (real-time latency and call assist).",
        };
      default:
        return {
          primaryResponse: "I hear what you're saying, and it's a valid point. To ensure I address that accurately, could you clarify what you'd like to see solved first?",
          alternativeResponse1: "Thanks for raising that. Let's pause on the presentation and focus on how we can address that specific point for your team.",
          alternativeResponse2: "Understood. If we can solve that together, would there be any other blockers to moving forward?",
          sentimentAnalysis: "Customer needs active listening and deeper discovery before proceeding.",
          approachExplanation: "Clarify the objection with active listening questions and address the core concern.",
        };
    }
  }
}

export const openAIService = new OpenAIService();
