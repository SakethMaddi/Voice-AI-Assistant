import { PrismaClient } from '@prisma/client';
import { env } from '../utils/env.js';

let prismaInstance: PrismaClient | null = null;
let useMemoryFallback = false;

// In-memory data store for fallback/mock testing mode
interface MemoryStore {
  calls: Map<string, any>;
  transcripts: Map<string, any>;
  objections: Map<string, any>;
  suggestions: Map<string, any>;
  feedbacks: Map<string, any>;
  reports: Map<string, any>;
}

const memoryStore: MemoryStore = {
  calls: new Map(),
  transcripts: new Map(),
  objections: new Map(),
  suggestions: new Map(),
  feedbacks: new Map(),
  reports: new Map(),
};

function generateId(): string {
  return 'c' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// Memory database adapter mimicking Prisma interface
export const memoryDb = {
  call: {
    create: async ({ data }: { data: any }) => {
      const id = data.id || generateId();
      const record = {
        id,
        customerPhoneNumber: data.customerPhoneNumber,
        twilioCallSid: data.twilioCallSid || null,
        livekitRoomId: data.livekitRoomId,
        status: data.status || 'INITIATED',
        startTime: data.startTime || new Date(),
        endTime: data.endTime || null,
        duration: data.duration || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryStore.calls.set(id, record);
      return { ...record };
    },
    findUnique: async ({ where, include }: { where: any; include?: any }) => {
      let found: any = null;
      if (where.id) {
        found = memoryStore.calls.get(where.id);
      } else if (where.twilioCallSid) {
        found = Array.from(memoryStore.calls.values()).find(
          (c) => c.twilioCallSid === where.twilioCallSid
        );
      } else if (where.livekitRoomId) {
        found = Array.from(memoryStore.calls.values()).find(
          (c) => c.livekitRoomId === where.livekitRoomId
        );
      }
      if (!found) return null;

      const result = { ...found };
      if (include?.transcripts) {
        result.transcripts = Array.from(memoryStore.transcripts.values())
          .filter((t) => t.callId === result.id)
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      }
      if (include?.objections) {
        result.objections = Array.from(memoryStore.objections.values())
          .filter((o) => o.callId === result.id)
          .map((o) => {
            const obj = { ...o };
            if (include.objections.include?.suggestions) {
              obj.suggestions = Array.from(memoryStore.suggestions.values())
                .filter((s) => s.objectionId === o.id)
                .map((s) => {
                  const sug = { ...s };
                  if (include.objections.include.suggestions.include?.feedbacks) {
                    sug.feedbacks = Array.from(memoryStore.feedbacks.values()).filter(
                      (f) => f.suggestionId === s.id
                    );
                  }
                  return sug;
                });
            }
            return obj;
          });
      }
      if (include?.reports) {
        result.reports = Array.from(memoryStore.reports.values()).filter(
          (r) => r.callId === result.id
        );
      }
      return result;
    },
    findMany: async (args?: any) => {
      const calls = Array.from(memoryStore.calls.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      if (args?.include) {
        return Promise.all(
          calls.map((c) => memoryDb.call.findUnique({ where: { id: c.id }, include: args.include }))
        );
      }
      return calls;
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      const existing = await memoryDb.call.findUnique({ where });
      if (!existing) throw new Error(`Call not found`);
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      memoryStore.calls.set(existing.id, updated);
      return updated;
    },
  },
  transcript: {
    create: async ({ data }: { data: any }) => {
      const id = data.id || generateId();
      const record = {
        id,
        callId: data.callId,
        speaker: data.speaker,
        text: data.text,
        isFinal: data.isFinal ?? true,
        timestamp: data.timestamp || new Date(),
      };
      memoryStore.transcripts.set(id, record);
      return { ...record };
    },
    findMany: async ({ where, orderBy }: { where?: any; orderBy?: any }) => {
      let list = Array.from(memoryStore.transcripts.values());
      if (where?.callId) {
        list = list.filter((t) => t.callId === where.callId);
      }
      return list.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    },
  },
  objection: {
    create: async ({ data }: { data: any }) => {
      const id = data.id || generateId();
      const record = {
        id,
        callId: data.callId,
        category: data.category,
        customerStatement: data.customerStatement,
        customerIntent: data.customerIntent,
        sentiment: data.sentiment,
        confidence: data.confidence,
        detectedAt: data.detectedAt || new Date(),
      };
      memoryStore.objections.set(id, record);
      return { ...record };
    },
    findMany: async ({ where, include }: { where?: any; include?: any }) => {
      let list = Array.from(memoryStore.objections.values());
      if (where?.callId) {
        list = list.filter((o) => o.callId === where.callId);
      }
      if (include?.suggestions) {
        return list.map((o) => {
          const suggestions = Array.from(memoryStore.suggestions.values())
            .filter((s) => s.objectionId === o.id)
            .map((s) => {
              const sug = { ...s };
              if (include.suggestions.include?.feedbacks) {
                sug.feedbacks = Array.from(memoryStore.feedbacks.values()).filter(
                  (f) => f.suggestionId === s.id
                );
              }
              return sug;
            });
          return { ...o, suggestions };
        });
      }
      return list;
    },
    findUnique: async ({ where, include }: { where: any; include?: any }) => {
      const obj = memoryStore.objections.get(where.id);
      if (!obj) return null;
      const res = { ...obj };
      if (include?.suggestions) {
        res.suggestions = Array.from(memoryStore.suggestions.values())
          .filter((s) => s.objectionId === obj.id)
          .map((s) => {
            const sug = { ...s };
            if (include.suggestions.include?.feedbacks) {
              sug.feedbacks = Array.from(memoryStore.feedbacks.values()).filter(
                (f) => f.suggestionId === s.id
              );
            }
            return sug;
          });
      }
      return res;
    },
  },
  aISuggestion: {
    create: async ({ data }: { data: any }) => {
      const id = data.id || generateId();
      const record = {
        id,
        objectionId: data.objectionId,
        primaryResponse: data.primaryResponse,
        alternativeResponses: typeof data.alternativeResponses === 'string'
          ? data.alternativeResponses
          : JSON.stringify(data.alternativeResponses),
        rationale: data.rationale,
        sentimentAnalysis: data.sentimentAnalysis,
        createdAt: data.createdAt || new Date(),
      };
      memoryStore.suggestions.set(id, record);
      return { ...record };
    },
    findUnique: async ({ where, include }: { where: any; include?: any }) => {
      const sug = memoryStore.suggestions.get(where.id);
      if (!sug) return null;
      const res = { ...sug };
      if (include?.feedbacks) {
        res.feedbacks = Array.from(memoryStore.feedbacks.values()).filter(
          (f) => f.suggestionId === sug.id
        );
      }
      return res;
    },
  },
  agentFeedback: {
    create: async ({ data }: { data: any }) => {
      const id = data.id || generateId();
      const record = {
        id,
        suggestionId: data.suggestionId,
        status: data.status,
        editedResponse: data.editedResponse || null,
        notes: data.notes || null,
        feedbackTimestamp: data.feedbackTimestamp || new Date(),
      };
      memoryStore.feedbacks.set(id, record);
      return { ...record };
    },
    findMany: async ({ where }: { where?: any } = {}) => {
      let list = Array.from(memoryStore.feedbacks.values());
      if (where?.suggestionId) {
        list = list.filter((f) => f.suggestionId === where.suggestionId);
      }
      return list;
    },
  },
  callReport: {
    create: async ({ data }: { data: any }) => {
      const id = data.id || generateId();
      const record = {
        id,
        callId: data.callId,
        objectionReport: typeof data.objectionReport === 'string' ? data.objectionReport : JSON.stringify(data.objectionReport),
        agentPerformanceReport: typeof data.agentPerformanceReport === 'string' ? data.agentPerformanceReport : JSON.stringify(data.agentPerformanceReport),
        aiAccuracyReport: typeof data.aiAccuracyReport === 'string' ? data.aiAccuracyReport : JSON.stringify(data.aiAccuracyReport),
        createdAt: data.createdAt || new Date(),
      };
      memoryStore.reports.set(id, record);
      return { ...record };
    },
    findFirst: async ({ where }: { where: any }) => {
      if (where?.callId) {
        return Array.from(memoryStore.reports.values()).find((r) => r.callId === where.callId) || null;
      }
      return null;
    },
    findMany: async ({ where }: { where?: any } = {}) => {
      let list = Array.from(memoryStore.reports.values());
      if (where?.callId) {
        list = list.filter((r) => r.callId === where.callId);
      }
      return list;
    },
  },
};

export async function getDbClient() {
  if (useMemoryFallback) {
    return memoryDb;
  }

  if (!prismaInstance) {
    try {
      const client = new PrismaClient({
        datasources: {
          db: {
            url: env.DATABASE_URL,
          },
        },
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      });

      // Try quick connection
      await client.$connect();
      prismaInstance = client;
      console.log('✅ Connected to PostgreSQL database via Prisma');
      return prismaInstance;
    } catch (err: any) {
      console.warn('⚠️  PostgreSQL connection unavailable, switching to reliable in-memory database store:', err.message);
      useMemoryFallback = true;
      return memoryDb;
    }
  }

  return prismaInstance;
}

export function resetMemoryDb() {
  memoryStore.calls.clear();
  memoryStore.transcripts.clear();
  memoryStore.objections.clear();
  memoryStore.suggestions.clear();
  memoryStore.feedbacks.clear();
  memoryStore.reports.clear();
}
