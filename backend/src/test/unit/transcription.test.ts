import { describe, it, expect } from 'vitest';
import { transcriptionService } from '../../services/transcription.service.js';
import { getDbClient } from '../../plugins/prisma.js';

describe('Real-Time Transcription Processing (Unit)', () => {
  it('handles partial transcription segments without saving to DB', async () => {
    const partial = await transcriptionService.recordTranscript(
      'call_trans_1',
      'agent',
      'Hello, I am speaking partial words...',
      false
    );

    expect(partial).toBeTruthy();
    expect(partial?.isFinal).toBe(false);

    const db = await getDbClient();
    const list = await db.transcript.findMany({ where: { callId: 'call_trans_1' } });
    expect(list.length).toBe(0); // Partial segments are only broadcast in real-time
  });

  it('persists final transcription segments to DB with speaker tagging', async () => {
    const finalSeg = await transcriptionService.recordTranscript(
      'call_trans_2',
      'customer',
      'Yes, we need more information about your enterprise plan.',
      true
    );

    expect(finalSeg).toBeTruthy();
    expect(finalSeg?.speaker).toBe('customer');
    expect(finalSeg?.text).toContain('enterprise plan');

    const db = await getDbClient();
    const list = await db.transcript.findMany({ where: { callId: 'call_trans_2' } });
    expect(list.length).toBe(1);
    expect(list[0].speaker).toBe('customer');
  });

  it('ignores empty whitespace transcripts safely', async () => {
    const emptyResult = await transcriptionService.recordTranscript(
      'call_trans_3',
      'agent',
      '   ',
      true
    );
    expect(emptyResult).toBeNull();
  });
});
