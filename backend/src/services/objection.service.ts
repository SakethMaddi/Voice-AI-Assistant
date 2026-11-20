import { getDbClient } from '../plugins/prisma.js';
import { openAIService } from '../integrations/openai/openai.service.js';
import { wsManager } from '../plugins/websocket.js';
import { suggestionService } from './suggestion.service.js';
import {
  ObjectionDetectedEventData,
  SentimentUpdatedEventData,
} from '../utils/events.js';

export class ObjectionService {
  async processCustomerStatement(
    callId: string,
    statement: string,
    contextHistory: { speaker: string; text: string }[] = []
  ) {
    const db = await getDbClient();

    // Analyze with OpenAI
    const detectionResult = await openAIService.detectObjection(
      statement,
      contextHistory
    );

    // If an objection was detected
    if (detectionResult.objectionDetected && detectionResult.objectionCategory) {
      const savedObjection = await db.objection.create({
        data: {
          callId,
          category: detectionResult.objectionCategory,
          customerStatement: detectionResult.customerStatement || statement,
          customerIntent: detectionResult.customerIntent || 'Customer objection',
          sentiment: detectionResult.sentiment || 'neutral',
          confidence: detectionResult.confidenceScore || 0.8,
        },
      });

      // Broadcast objection detected
      const objectionPayload: ObjectionDetectedEventData = {
        id: savedObjection.id,
        callId,
        category: savedObjection.category,
        customerStatement: savedObjection.customerStatement,
        customerIntent: savedObjection.customerIntent,
        sentiment: savedObjection.sentiment,
        confidence: savedObjection.confidence,
        detectedAt: savedObjection.detectedAt.toISOString(),
      };

      wsManager.broadcast('objection.detected', callId, objectionPayload);

      // Broadcast sentiment update
      const sentimentScore =
        detectionResult.sentiment === 'positive'
          ? 0.7
          : detectionResult.sentiment === 'negative'
          ? -0.6
          : 0;

      const sentimentPayload: SentimentUpdatedEventData = {
        callId,
        sentiment: detectionResult.sentiment,
        score: sentimentScore,
        rationale: `Customer voiced objection: ${detectionResult.objectionCategory}`,
        timestamp: new Date().toISOString(),
      };

      wsManager.broadcast('sentiment.updated', callId, sentimentPayload);

      // Automatically generate AI suggestions in the background immediately
      suggestionService
        .generateSuggestionsForObjection(
          callId,
          savedObjection.id,
          {
            category: savedObjection.category,
            customerStatement: savedObjection.customerStatement,
            customerIntent: savedObjection.customerIntent,
          },
          contextHistory
        )
        .catch((err) => {
          console.error('Error generating suggestions for objection:', err);
        });

      return savedObjection;
    }

    return null;
  }
}

export const objectionService = new ObjectionService();
