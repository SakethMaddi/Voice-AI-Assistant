import { getDbClient } from '../plugins/prisma.js';
import { wsManager } from '../plugins/websocket.js';
import { objectionService } from './objection.service.js';
import { openAIService } from '../integrations/openai/openai.service.js';
import { TranscriptEventData } from '../utils/events.js';

export class TranscriptionService {
  private lastRecordedSentence = new Map<string, string>();

  /**
   * Process and store incoming speech transcript
   */
  async recordTranscript(
    callId: string,
    speaker: 'agent' | 'customer',
    text: string,
    isFinal = true
  ) {
    const cleanText = text.trim();
    if (!cleanText) return null;

    if (isFinal) {
      const speakerKey = `${callId}:${speaker}`;
      // Prevent consecutive identical sentences from being repeated
      if (this.lastRecordedSentence.get(speakerKey) === cleanText.toLowerCase()) {
        return null;
      }
      this.lastRecordedSentence.set(speakerKey, cleanText.toLowerCase());
    }

    if (!isFinal) {
      // Partial / interim transcript for real-time visual feedback
      const partialPayload: TranscriptEventData = {
        id: `partial_${Date.now()}`,
        callId,
        speaker,
        text: cleanText,
        isFinal: false,
        timestamp: new Date().toISOString(),
      };
      wsManager.broadcast('transcript.partial', callId, partialPayload);
      return partialPayload;
    }

    const db = await getDbClient();

    // Persist final transcript to database
    const savedTranscript = await db.transcript.create({
      data: {
        callId,
        speaker,
        text: cleanText,
        isFinal: true,
      },
    });

    const finalPayload: TranscriptEventData = {
      id: savedTranscript.id,
      callId,
      speaker,
      text: savedTranscript.text,
      isFinal: true,
      timestamp: savedTranscript.timestamp.toISOString(),
    };

    wsManager.broadcast('transcript.final', callId, finalPayload);

    // If customer spoke, evaluate objection in background
    if (speaker === 'customer') {
      this.triggerObjectionEvaluation(callId, cleanText).catch((err) => {
        console.error('Error during automatic objection evaluation:', err);
      });
    }

    return savedTranscript;
  }

  private async triggerObjectionEvaluation(callId: string, customerStatement: string) {
    const db = await getDbClient();

    // Fetch last 10 transcripts for context
    const recentTranscripts = await db.transcript.findMany({
      where: { callId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    const contextHistory = recentTranscripts
      .reverse()
      .map((t: any) => ({ speaker: t.speaker, text: t.text }));

    await objectionService.processCustomerStatement(
      callId,
      customerStatement,
      contextHistory
    );
  }

  /**
   * Transcribe raw audio chunk using OpenAI Whisper
   */
  async processAudioBuffer(
    callId: string,
    speaker: 'agent' | 'customer',
    audioBuffer: Buffer,
    isFinal = true
  ) {
    try {
      const transcribedText = await openAIService.transcribeAudio(audioBuffer, 'audio.webm', speaker);
      if (transcribedText) {
        return await this.recordTranscript(callId, speaker, transcribedText, isFinal);
      }
    } catch (err: any) {
      console.error('Audio chunk transcription error:', err.message);
    }
    return null;
  }
}

export const transcriptionService = new TranscriptionService();
