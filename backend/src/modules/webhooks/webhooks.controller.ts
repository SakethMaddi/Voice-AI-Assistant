import { FastifyRequest, FastifyReply } from 'fastify';
import { twilioService } from '../../integrations/twilio/twilio.service.js';
import { validateTwilioWebhookSignature } from '../../integrations/twilio/twilio.client.js';
import { getDbClient } from '../../plugins/prisma.js';
import { wsManager } from '../../plugins/websocket.js';
import { callsController } from '../calls/calls.controller.js';
import { env } from '../../utils/env.js';

// Cache to prevent duplicate webhook processing
const processedWebhookEvents = new Set<string>();

export class WebhooksController {
  /**
   * Twilio Voice Webhook: returns TwiML with SIP dial to LiveKit
   */
  async handleTwilioVoice(req: FastifyRequest, reply: FastifyReply) {
    const signature = req.headers['x-twilio-signature'] as string | undefined;
    const url = `${env.BACKEND_URL}${req.url}`;
    const params = (req.body as Record<string, any>) || {};

    const isValid = validateTwilioWebhookSignature(signature, url, params);
    if (!isValid) {
      return reply.status(403).send('Invalid Twilio signature');
    }

    const query = req.query as Record<string, string>;
    const callId = query.callId || params.callId || 'default_call';
    const room = query.room || params.room || `room_${callId}`;

    const twiml = twilioService.generateVoiceTwiml(callId, room);
    return reply.type('text/xml').send(twiml);
  }

  /**
   * Twilio Call Status Webhook: handles ringing, in-progress, completed, etc.
   */
  async handleTwilioStatus(req: FastifyRequest, reply: FastifyReply) {
    const signature = req.headers['x-twilio-signature'] as string | undefined;
    const url = `${env.BACKEND_URL}${req.url}`;
    const body = (req.body as Record<string, any>) || {};

    const isValid = validateTwilioWebhookSignature(signature, url, body);
    if (!isValid) {
      return reply.status(403).send('Invalid Twilio signature');
    }

    const callSid = body.CallSid;
    const callStatus = body.CallStatus; // initiated, ringing, in-progress, completed, busy, no-answer, failed
    const sequenceNumber = body.SequenceNumber || '0';

    // Prevent duplicate webhook event processing
    const dedupeKey = `twilio:${callSid}:${callStatus}:${sequenceNumber}`;
    if (processedWebhookEvents.has(dedupeKey)) {
      return reply.send({ status: 'already_processed' });
    }
    processedWebhookEvents.add(dedupeKey);
    if (processedWebhookEvents.size > 2000) {
      processedWebhookEvents.clear();
    }

    const db = await getDbClient();
    const query = req.query as Record<string, string>;
    const callId = query.callId;

    let call = null;
    if (callId) {
      call = await db.call.findUnique({ where: { id: callId } });
    } else if (callSid) {
      call = await db.call.findUnique({ where: { twilioCallSid: callSid } });
    }

    if (!call) {
      return reply.send({ status: 'call_not_found_ignored' });
    }

    if (callStatus === 'in-progress') {
      await db.call.update({
        where: { id: call.id },
        data: { status: 'IN_PROGRESS' },
      });

      wsManager.broadcast('call.connected', call.id, {
        callId: call.id,
        livekitRoomId: call.livekitRoomId,
        status: 'IN_PROGRESS',
        connectedAt: new Date().toISOString(),
      });
    } else if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(callStatus)) {
      const finalStatus =
        callStatus === 'completed'
          ? 'COMPLETED'
          : callStatus === 'no-answer'
          ? 'NO_ANSWER'
          : 'FAILED';

      // If call is not already completed, end it
      if (call.status !== 'COMPLETED') {
        const dummyReq = { params: { id: call.id } } as any;
        const dummyReply = { status: () => ({ send: () => {} }), send: () => {} } as any;
        await callsController.endCall(dummyReq, dummyReply);
      }
    }

    return reply.send({ status: 'ok', callStatus });
  }

  /**
   * LiveKit Webhook: handles participant join/leave, track published, room cleanup
   */
  async handleLiveKitWebhook(req: FastifyRequest, reply: FastifyReply) {
    const body = (req.body as Record<string, any>) || {};
    const event = body.event;
    const room = body.room?.name;

    if (!room) {
      return reply.send({ status: 'ignored_no_room' });
    }

    // Extract callId from room name (format: "room_c_xxx")
    const callId = room.startsWith('room_') ? room.replace('room_', '') : room;

    if (event === 'participant_joined') {
      const participant = body.participant;
      console.log(`[LiveKit Webhook] Participant ${participant?.identity} joined room ${room}`);
      
      if (participant?.identity?.includes('customer') || participant?.identity?.includes('sip')) {
        const db = await getDbClient();
        await db.call.update({
          where: { livekitRoomId: room },
          data: { status: 'IN_PROGRESS' },
        }).catch(() => {});

        wsManager.broadcast('call.connected', callId, {
          callId,
          livekitRoomId: room,
          status: 'IN_PROGRESS',
          connectedAt: new Date().toISOString(),
        });
      }
    } else if (event === 'room_finished') {
      console.log(`[LiveKit Webhook] Room ${room} finished.`);
    }

    return reply.send({ status: 'ok' });
  }
}

export const webhooksController = new WebhooksController();
