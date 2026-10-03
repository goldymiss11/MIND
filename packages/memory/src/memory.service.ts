import { eq, and, or, asc, desc, isNull, gt, cosineDistance } from "drizzle-orm";
import { db as defaultDb, schema, type MindDb } from "@mind/db";
import { AiService, Type } from "@mind/ai";
import type {
  ExtractedMemoryItem,
  MemoryContextPack,
  LogAiRunFn,
  SaveMemoriesOptions,
  MemoryServiceOptions,
} from "./types.js";

export function sanitizeImportance(val: any): number {
  if (val === undefined || val === null || isNaN(Number(val))) return 1;
  const num = Number(val);
  if (num > 0 && num <= 1) return Math.max(1, Math.min(10, Math.round(num * 10)));
  return Math.max(1, Math.min(10, Math.round(num)));
}

export const MEMORY_EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    hasMemory: { type: Type.BOOLEAN, description: "Whether the text contains facts or preferences about the user" },
    memories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: [
              "semantic",
              "episodic",
              "preference",
              "task",
              "project",
              "relationship",
              "decision",
              "document",
              "educational",
              "professional",
            ],
          },
          content: { type: Type.STRING, description: "Extracted memory or fact" },
          importance: { type: Type.NUMBER, description: "Importance score (0-3)" },
          confidence: { type: Type.NUMBER, description: "Confidence score (0.0-1.0)" },
        },
        required: ["type", "content"],
      },
    },
  },
  required: ["hasMemory", "memories"],
};

export class MemoryService {
  private readonly db: MindDb;
  private readonly ai: AiService;
  private readonly deduplicationThreshold: number;

  constructor(options?: MemoryServiceOptions | MindDb) {
    if (options && "query" in options) {
      this.db = options;
      this.ai = new AiService();
      this.deduplicationThreshold = 0.15;
    } else {
      this.db = options?.db ?? defaultDb;
      this.ai = options?.ai ?? new AiService();
      this.deduplicationThreshold = options?.deduplicationThreshold ?? 0.15;
    }
  }

  /**
   * Extract personal memories and preferences from user text using AI analyzer.
   */
  async extractMemories(
    text: string,
    options?: { userId?: string; logAiRun?: LogAiRunFn }
  ): Promise<ExtractedMemoryItem[]> {
    const systemPrompt =
      "Analyze the user message to extract personal memories, user preferences, and enduring facts. If there are no clear facts or preferences, return hasMemory=false.";
    const res = await this.ai.generateStructured<any>(text, MEMORY_EXTRACTION_SCHEMA, {
      tier: "simple",
      systemInstruction: systemPrompt,
    });

    if (options?.userId && options?.logAiRun) {
      await options.logAiRun(options.userId, "memory_extraction", res);
    }

    if (res.result?.hasMemory && Array.isArray(res.result.memories)) {
      return res.result.memories;
    }

    return [];
  }

  /**
   * Vector deduplication and persistence logic.
   * If a memory with cosine distance < 0.15 already exists for the user,
   * updates the existing memory. Otherwise inserts a new memory record.
   */
  async saveMemories(
    userId: string,
    memories: ExtractedMemoryItem[],
    options?: SaveMemoriesOptions
  ): Promise<string[]> {
    const savedMemoryIds: string[] = [];
    if (!Array.isArray(memories)) return savedMemoryIds;

    for (const mem of memories) {
      if (!mem.content) continue;

      let embRes: { result: number[]; model: string; usage?: any } | null = null;
      try {
        embRes = await this.ai.generateEmbedding(mem.content, { tier: "embedding" });
        if (options?.logAiRun) {
          await options.logAiRun(userId, "memory_embedding", embRes);
        }
      } catch (embErr) {
        console.warn(`[MemoryService] Embedding generation failed for memory. Falling back to text-only storage:`, embErr);
      }

      if (embRes && Array.isArray(embRes.result)) {
        // Deduplication check via cosine distance
        const distanceSql = cosineDistance(schema.memories.embedding, embRes.result);
        const similarMemories = await this.db
          .select({ id: schema.memories.id, distance: distanceSql })
          .from(schema.memories)
          .where(eq(schema.memories.userId, userId))
          .orderBy(asc(distanceSql))
          .limit(1);

        if (similarMemories.length > 0 && (similarMemories[0]?.distance as number) < this.deduplicationThreshold) {
          const updateData: Record<string, any> = { content: mem.content, updatedAt: new Date() };
          if (options?.sourceMessageId) updateData.sourceMessageId = options.sourceMessageId;
          await this.db
            .update(schema.memories)
            .set(updateData)
            .where(eq(schema.memories.id, similarMemories[0]!.id));
          savedMemoryIds.push(similarMemories[0]!.id as string);
        } else {
          const inserted = await this.db
            .insert(schema.memories)
            .values({
              userId,
              type: mem.type || "semantic",
              content: mem.content,
              importance: sanitizeImportance(mem.importance),
              confidence: mem.confidence ?? 1.0,
              source: "conversation",
              sourceMessageId: options?.sourceMessageId ?? null,
              embedding: embRes.result,
            })
            .returning();
          savedMemoryIds.push(inserted[0]!.id as string);
        }
      } else {
        // Fallback without embeddings: exact match deduplication
        const exactMemories = await this.db
          .select({ id: schema.memories.id })
          .from(schema.memories)
          .where(and(eq(schema.memories.userId, userId), eq(schema.memories.content, mem.content)))
          .limit(1);

        if (exactMemories.length > 0) {
          const updateData: Record<string, any> = { updatedAt: new Date() };
          if (options?.sourceMessageId) updateData.sourceMessageId = options.sourceMessageId;
          await this.db
            .update(schema.memories)
            .set(updateData)
            .where(eq(schema.memories.id, exactMemories[0]!.id));
          savedMemoryIds.push(exactMemories[0]!.id as string);
        } else {
          const inserted = await this.db
            .insert(schema.memories)
            .values({
              userId,
              type: mem.type || "semantic",
              content: mem.content,
              importance: sanitizeImportance(mem.importance),
              confidence: mem.confidence ?? 1.0,
              source: "conversation",
              sourceMessageId: options?.sourceMessageId ?? null,
              embedding: null,
            })
            .returning();
          savedMemoryIds.push(inserted[0]!.id as string);
        }
      }
    }

    return savedMemoryIds;
  }

  /**
   * Extract memories from raw text and save with deduplication.
   */
  async processAndSave(
    userId: string,
    text: string,
    options?: SaveMemoriesOptions
  ): Promise<string[]> {
    const extracted = await this.extractMemories(text, { userId, logAiRun: options?.logAiRun });
    return this.saveMemories(userId, extracted, options);
  }

  /**
   * Retrieve the top-N nearest memories based on vector semantic similarity,
   * excluding expired memories. If embedding fails, gracefully falls back to recent memories.
   */
  async retrieveRelevantMemories(
    userId: string,
    query: string,
    limit: number = 5,
    options?: { logAiRun?: LogAiRunFn }
  ) {
    const notExpiredCondition = or(
      isNull(schema.memories.expiresAt),
      gt(schema.memories.expiresAt, new Date())
    );

    try {
      const queryEmb = await this.ai.generateEmbedding(query, { tier: "embedding" });
      if (options?.logAiRun) {
        await options.logAiRun(userId, "query_embedding", queryEmb);
      }

      const distanceSql = cosineDistance(schema.memories.embedding, queryEmb.result);
      return await this.db
        .select()
        .from(schema.memories)
        .where(and(eq(schema.memories.userId, userId), notExpiredCondition))
        .orderBy(asc(distanceSql))
        .limit(limit);
    } catch (err) {
      console.warn(`[MemoryService] Vector memory retrieval failed. Falling back to recency-based retrieval:`, err);
      return await this.db
        .select()
        .from(schema.memories)
        .where(and(eq(schema.memories.userId, userId), notExpiredCondition))
        .orderBy(desc(schema.memories.updatedAt))
        .limit(limit);
    }
  }

  /**
   * Assemble a context pack with nearest memories and formatted prompt text.
   */
  async assembleContextPack(
    userId: string,
    query: string,
    limit: number = 5,
    options?: { logAiRun?: LogAiRunFn }
  ): Promise<MemoryContextPack> {
    const memories = await this.retrieveRelevantMemories(userId, query, limit, options);
    let formattedText = "";
    if (memories.length > 0) {
      formattedText =
        "Известные факты о пользователе:\n" +
        memories.map((m) => `- ${m.content}`).join("\n");
    }

    return {
      memories: memories as any,
      formattedText,
    };
  }
}
