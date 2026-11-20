import { FastifyRequest, FastifyReply } from 'fastify';
import { AnalyzeObjectionInputSchema } from '../../schemas/calls.schema.js';
import { transcriptionService } from '../../services/transcription.service.js';
import { objectionService } from '../../services/objection.service.js';
import { getDbClient } from '../../plugins/prisma.js';

export class ObjectionsController {
  async analyzeObjection(req: FastifyRequest, reply: FastifyReply) {
    const parseResult = AnalyzeObjectionInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    const { callId, customerStatement, speaker } = parseResult.data;

    // Record the transcript
    await transcriptionService.recordTranscript(callId, speaker, customerStatement, true);

    const db = await getDbClient();
    const recentTranscripts = await db.transcript.findMany({
      where: { callId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    const contextHistory = recentTranscripts
      .reverse()
      .map((t: any) => ({ speaker: t.speaker, text: t.text }));

    const detected = await objectionService.processCustomerStatement(
      callId,
      customerStatement,
      contextHistory
    );

    return reply.send({
      success: true,
      objection: detected,
    });
  }
}

export const objectionsController = new ObjectionsController();
