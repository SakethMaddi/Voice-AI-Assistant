import { FastifyRequest, FastifyReply } from 'fastify';
import { getDbClient } from '../../plugins/prisma.js';
import { livekitService } from '../../integrations/livekit/livekit.service.js';
import { twilioService } from '../../integrations/twilio/twilio.service.js';
import { wsManager } from '../../plugins/websocket.js';
import { reportService } from '../../services/report.service.js';
import { transcriptionService } from '../../services/transcription.service.js';
import { InitiateCallSchema, EndCallSchema } from '../../schemas/calls.schema.js';
import { env } from '../../utils/env.js';

// Active simulated call timeouts
const activeSimulations = new Map<string, NodeJS.Timeout[]>();

export class CallsController {
  async initiateCall(req: FastifyRequest, reply: FastifyReply) {
    const parseResult = InitiateCallSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    const { customerPhoneNumber, simulatedScenario } = parseResult.data;
    const db = await getDbClient();

    // 1. Create unique room and temporary ID
    const uniqueId = 'c_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const livekitRoomId = `room_${uniqueId}`;

    // 2. Create LiveKit Room
    await livekitService.createRoom(livekitRoomId);

    // 3. Generate tokens
    const agentToken = await livekitService.generateAgentToken(livekitRoomId, 'sales_rep');
    const customerToken = await livekitService.generateCustomerToken(livekitRoomId, 'customer_phone');

    // 4. Determine public backend URL from request headers if available
    const hostHeader = (req.headers['x-forwarded-host'] || req.headers.host) as string | undefined;
    const protoHeader = (req.headers['x-forwarded-proto'] || (req.protocol === 'https' ? 'https' : 'http')) as string;
    const publicBackendUrl = hostHeader ? `${protoHeader}://${hostHeader}` : env.BACKEND_URL;

    // 5. Initiate Twilio Call
    const twilioResult = await twilioService.initiateCall(
      customerPhoneNumber,
      uniqueId,
      livekitRoomId,
      publicBackendUrl
    );

    // 5. Save Call Record
    const call = await db.call.create({
      data: {
        id: uniqueId,
        customerPhoneNumber,
        twilioCallSid: twilioResult.callSid,
        livekitRoomId,
        status: 'INITIATED',
        startTime: new Date(),
      },
    });

    // 6. Broadcast call.started
    wsManager.broadcast('call.started', call.id, {
      callId: call.id,
      customerPhoneNumber: call.customerPhoneNumber,
      livekitRoomId: call.livekitRoomId,
      status: call.status,
    });

    // 7. If mock mode / simulated phone connection, simulate call progression
    if (twilioResult.isMock || env.MOCK_EXTERNAL_SERVICES) {
      this.runMockCallLifecycle(call.id);
    }

    return reply.status(201).send({
      callId: call.id,
      customerPhoneNumber: call.customerPhoneNumber,
      twilioCallSid: call.twilioCallSid,
      livekitRoomId: call.livekitRoomId,
      status: call.status,
      agentToken,
      customerToken,
      livekitUrl: env.LIVEKIT_URL,
      isMock: twilioResult.isMock,
    });
  }

  async endCall(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = req.params;
    const db = await getDbClient();

    const call = await db.call.findUnique({
      where: { id },
    });

    if (!call) {
      return reply.status(404).send({ error: 'Call not found' });
    }

    // Clear any pending simulation timeouts
    const timeouts = activeSimulations.get(id);
    if (timeouts) {
      timeouts.forEach((t) => clearTimeout(t));
      activeSimulations.delete(id);
    }

    // Calculate duration
    const endTime = new Date();
    const startTime = call.startTime || new Date();
    const duration = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

    // Update call status
    const updatedCall = await db.call.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endTime,
        duration,
      },
    });

    // Terminate Twilio call if SID exists
    if (call.twilioCallSid) {
      await twilioService.endCall(call.twilioCallSid);
    }

    // Cleanup LiveKit room
    await livekitService.cleanupRoom(call.livekitRoomId);

    // Generate comprehensive post-call report
    const report = await reportService.generateCallReport(id);

    // Broadcast call.ended
    wsManager.broadcast('call.ended', id, {
      callId: id,
      duration,
      status: 'COMPLETED',
      endedAt: endTime.toISOString(),
    });

    return reply.send({
      success: true,
      call: updatedCall,
      report,
    });
  }

  async getCall(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = req.params;
    const db = await getDbClient();

    const call = await db.call.findUnique({
      where: { id },
      include: {
        transcripts: true,
        objections: {
          include: {
            suggestions: {
              include: {
                feedbacks: true,
              },
            },
          },
        },
        reports: true,
      },
    });

    if (!call) {
      return reply.status(404).send({ error: 'Call not found' });
    }

    return reply.send(call);
  }

  async listCalls(req: FastifyRequest, reply: FastifyReply) {
    const db = await getDbClient();
    const calls = await db.call.findMany({
      include: {
        transcripts: true,
        objections: {
          include: {
            suggestions: true,
          },
        },
        reports: true,
      },
    });

    return reply.send(calls);
  }

  async getCallTranscript(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = req.params;
    const db = await getDbClient();

    const transcripts = await db.transcript.findMany({
      where: { callId: id },
      orderBy: { timestamp: 'asc' },
    });

    return reply.send(transcripts);
  }

  async getCallReport(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = req.params;
    const report = await reportService.getCallReport(id);

    if (!report) {
      return reply.status(404).send({ error: 'Report not generated yet for this call' });
    }

    return reply.send(report);
  }

  async processAudioChunk(
    req: FastifyRequest<{ Params: { id: string }; Body: { speaker?: 'agent' | 'customer'; audioBase64?: string; isFinal?: boolean } }>,
    reply: FastifyReply
  ) {
    const { id } = req.params;
    const body = req.body || {};
    const speaker = body.speaker || 'customer';
    const isFinal = body.isFinal ?? true;

    if (!body.audioBase64) {
      return reply.status(400).send({ error: 'Missing audioBase64 data' });
    }

    try {
      const audioBuffer = Buffer.from(body.audioBase64, 'base64');
      const result = await transcriptionService.processAudioBuffer(id, speaker, audioBuffer, isFinal);
      return reply.send({ success: true, result });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Audio processing failed' });
    }
  }

  /**
   * Helper to simulate realistic speech conversation events when in mock mode
   * Follows the exact realistic conversation progression from the reference video:
   * 1. Customer greeting & availability
   * 2. Agent intro & focused operations question
   * 3. Customer Objection 1: "We already work with another provider. Switching workflows is a headache, and implementation takes time."
   * 4. Agent handles Objection 1 with recommended rebuttal
   * 5. Customer Objection 2: "That makes sense. But the main constraint this quarter is timing; we don't have budget this quarter."
   */
  private runMockCallLifecycle(callId: string) {
    const timeouts: NodeJS.Timeout[] = [];

    // Step 1: Call connects in 1.2s
    const t1 = setTimeout(async () => {
      const db = await getDbClient();
      await db.call.update({
        where: { id: callId },
        data: { status: 'IN_PROGRESS' },
      });

      wsManager.broadcast('call.connected', callId, {
        callId,
        livekitRoomId: `room_${callId}`,
        status: 'IN_PROGRESS',
        connectedAt: new Date().toISOString(),
      });
    }, 1200);
    timeouts.push(t1);

    // Step 2: Customer greets (at 2.5s)
    const t2 = setTimeout(async () => {
      await transcriptionService.recordTranscript(
        callId,
        'customer',
        'Hi, thanks for reaching out. I have about ten minutes before my next team meeting.',
        true
      );
    }, 2500);
    timeouts.push(t2);

    // Step 3: Agent intro & focus (at 5.5s)
    const t3 = setTimeout(async () => {
      await transcriptionService.recordTranscript(
        callId,
        'agent',
        "Thanks! I'll keep it focused. What is the biggest operations challenge on your team right now?",
        true
      );
    }, 5500);
    timeouts.push(t3);

    // Step 4: Customer Objection 1 - Provider & switching friction (at 9s)
    const t4 = setTimeout(async () => {
      await transcriptionService.recordTranscript(
        callId,
        'customer',
        'We already work with another provider. Switching workflows is a headache, and implementation takes time.',
        true
      );
    }, 9000);
    timeouts.push(t4);

    // Step 5: Agent handles Objection 1 (at 16s)
    const t5 = setTimeout(async () => {
      await transcriptionService.recordTranscript(
        callId,
        'agent',
        'Understandable—changing providers takes effort. What is working well today, and where do you still see friction? We can compare options without assuming a switch is right.',
        true
      );
    }, 16000);
    timeouts.push(t5);

    // Step 6: Customer Objection 2 - Timing & Budget constraint (at 22s)
    const t6 = setTimeout(async () => {
      await transcriptionService.recordTranscript(
        callId,
        'customer',
        "That makes sense. But the main constraint this quarter is timing; we don't have budget this quarter.",
        true
      );
    }, 22000);
    timeouts.push(t6);

    activeSimulations.set(callId, timeouts);
  }
}

export const callsController = new CallsController();
