import { getDbClient } from '../plugins/prisma.js';
import { openAIService } from '../integrations/openai/openai.service.js';
import { wsManager } from '../plugins/websocket.js';
import {
  SuggestionGeneratedEventData,
  SuggestionFeedbackEventData,
} from '../utils/events.js';

export class SuggestionService {
  async generateSuggestionsForObjection(
    callId: string,
    objectionId: string,
    objectionData: {
      category: string;
      customerStatement: string;
      customerIntent: string;
    },
    contextHistory: { speaker: string; text: string }[] = []
  ) {
    const db = await getDbClient();

    // Call OpenAI
    const suggestionsResult = await openAIService.generateSuggestions(
      objectionData,
      contextHistory
    );

    const alternativeArray = [
      suggestionsResult.alternativeResponse1,
      suggestionsResult.alternativeResponse2,
    ];

    // Save to database
    const savedSuggestion = await db.aISuggestion.create({
      data: {
        objectionId,
        primaryResponse: suggestionsResult.primaryResponse,
        alternativeResponses: JSON.stringify(alternativeArray),
        rationale: suggestionsResult.approachExplanation,
        sentimentAnalysis: suggestionsResult.sentimentAnalysis,
      },
    });

    // Broadcast over WebSocket
    const eventPayload: SuggestionGeneratedEventData = {
      id: savedSuggestion.id,
      objectionId,
      primaryResponse: savedSuggestion.primaryResponse,
      alternativeResponses: alternativeArray,
      rationale: savedSuggestion.rationale,
      sentimentAnalysis: savedSuggestion.sentimentAnalysis,
      createdAt: savedSuggestion.createdAt.toISOString(),
    };

    wsManager.broadcast('suggestion.generated', callId, eventPayload);

    return savedSuggestion;
  }

  async recordAgentFeedback(
    suggestionId: string,
    feedback: {
      status: 'ACCEPTED' | 'REJECTED' | 'EDITED';
      editedResponse?: string | null;
      notes?: string | null;
    }
  ) {
    const db = await getDbClient();

    const suggestion = await db.aISuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion) {
      throw new Error(`Suggestion ${suggestionId} not found`);
    }

    const objection = await db.objection.findUnique({
      where: { id: suggestion.objectionId },
    });

    const callId = objection?.callId || 'unknown';

    // Store feedback
    const savedFeedback = await db.agentFeedback.create({
      data: {
        suggestionId,
        status: feedback.status,
        editedResponse: feedback.editedResponse || null,
        notes: feedback.notes || null,
      },
    });

    // Broadcast feedback event
    const eventPayload: SuggestionFeedbackEventData = {
      id: savedFeedback.id,
      suggestionId,
      status: feedback.status,
      editedResponse: feedback.editedResponse,
      feedbackTimestamp: savedFeedback.feedbackTimestamp.toISOString(),
    };

    wsManager.broadcast('suggestion.feedback', callId, eventPayload);

    return savedFeedback;
  }
}

export const suggestionService = new SuggestionService();
