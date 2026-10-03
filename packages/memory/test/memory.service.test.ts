import { test } from "node:test";
import assert from "node:assert";
import { MemoryService } from "../src/memory.service.js";

test("MemoryService: extractMemories returns extracted items from structured output", async () => {
  const mockAi: any = {
    generateStructured: async () => ({
      result: {
        hasMemory: true,
        memories: [
          { type: "preference", content: "Prefers concise answers", importance: 2 },
          { type: "educational", content: "Studies CS", importance: 3 },
        ],
      },
      usage: {},
    }),
  };

  const mockDb: any = {};
  const svc = new MemoryService({ db: mockDb, ai: mockAi });
  const items = await svc.extractMemories("I study CS and prefer concise answers");

  assert.equal(items.length, 2);
  assert.equal(items[0]?.content, "Prefers concise answers");
  assert.equal(items[1]?.type, "educational");
});

test("MemoryService: saveMemories updates existing memory when distance < 0.15 (deduplication)", async () => {
  let updated = false;
  let inserted = false;

  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => [{ id: "mem-existing", distance: 0.08 }],
          }),
        }),
      }),
    }),
    update: () => ({
      set: (val: any) => ({
        where: async () => {
          updated = true;
          assert.equal(val.content, "Updated fact");
        },
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: async () => {
          inserted = true;
          return [{ id: "mem-new" }];
        },
      }),
    }),
  };

  const mockAi: any = {
    generateEmbedding: async () => ({ result: [0.1, 0.2], usage: {} }),
  };

  const svc = new MemoryService({ db: mockDb, ai: mockAi });
  const ids = await svc.saveMemories("user-1", [
    { type: "semantic", content: "Updated fact", importance: 2 },
  ]);

  assert.equal(ids.length, 1);
  assert.equal(ids[0], "mem-existing");
  assert.ok(updated);
  assert.ok(!inserted);
});

test("MemoryService: saveMemories inserts new record when distance >= 0.15", async () => {
  let updated = false;
  let inserted = false;

  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => [{ id: "mem-other", distance: 0.45 }],
          }),
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => {
          updated = true;
        },
      }),
    }),
    insert: () => ({
      values: (val: any) => ({
        returning: async () => {
          inserted = true;
          assert.equal(val.content, "Brand new fact");
          return [{ id: "mem-new-1" }];
        },
      }),
    }),
  };

  const mockAi: any = {
    generateEmbedding: async () => ({ result: [0.3, 0.4], usage: {} }),
  };

  const svc = new MemoryService({ db: mockDb, ai: mockAi });
  const ids = await svc.saveMemories("user-1", [
    { type: "semantic", content: "Brand new fact", importance: 2 },
  ]);

  assert.equal(ids.length, 1);
  assert.equal(ids[0], "mem-new-1");
  assert.ok(!updated);
  assert.ok(inserted);
});

test("MemoryService: retrieveRelevantMemories retrieves nearest memories", async () => {
  const mockMemories = [
    { id: "m-1", content: "Fact 1" },
    { id: "m-2", content: "Fact 2" },
  ];

  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async (n: number) => {
              assert.equal(n, 5);
              return mockMemories;
            },
          }),
        }),
      }),
    }),
  };

  const mockAi: any = {
    generateEmbedding: async () => ({ result: [0.1], usage: {} }),
  };

  const svc = new MemoryService({ db: mockDb, ai: mockAi });
  const results = await svc.retrieveRelevantMemories("user-1", "test query");

  assert.equal(results.length, 2);
  assert.equal(results[0]?.content, "Fact 1");
});

test("MemoryService: assembleContextPack formats text correctly", async () => {
  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => [
              { id: "m-1", content: "Lives in Amsterdam" },
              { id: "m-2", content: "Likes TypeScript" },
            ],
          }),
        }),
      }),
    }),
  };

  const mockAi: any = {
    generateEmbedding: async () => ({ result: [0.1], usage: {} }),
  };

  const svc = new MemoryService({ db: mockDb, ai: mockAi });
  const pack = await svc.assembleContextPack("user-1", "user info");

  assert.equal(pack.memories.length, 2);
  assert.ok(pack.formattedText.includes("- Lives in Amsterdam"));
  assert.ok(pack.formattedText.includes("- Likes TypeScript"));
});

test("MemoryService: retrieveRelevantMemories gracefully degrades when embedding fails (recency fallback)", async () => {
  const fallbackMemories = [
    { id: "m-recent-1", content: "Recent fact 1", updatedAt: new Date() },
    { id: "m-recent-2", content: "Recent fact 2", updatedAt: new Date() },
  ];

  let fallbackCalled = false;

  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => {
              fallbackCalled = true;
              return fallbackMemories;
            },
          }),
        }),
      }),
    }),
  };

  const mockAiFailing: any = {
    generateEmbedding: async () => {
      throw new Error("Gemini embeddings API unavailable (503)");
    },
  };

  const svc = new MemoryService({ db: mockDb, ai: mockAiFailing });
  const results = await svc.retrieveRelevantMemories("user-1", "anything");

  assert.ok(fallbackCalled);
  assert.equal(results.length, 2);
  assert.equal(results[0]?.content, "Recent fact 1");
});

test("MemoryService: saveMemories gracefully degrades when embedding fails (saves with null embedding)", async () => {
  let insertedVal: any = null;

  const mockDb: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [], // No exact match
        }),
      }),
    }),
    insert: () => ({
      values: (val: any) => ({
        returning: async () => {
          insertedVal = val;
          return [{ id: "mem-no-emb" }];
        },
      }),
    }),
  };

  const mockAiFailing: any = {
    generateEmbedding: async () => {
      throw new Error("Embedding quota exhausted");
    },
  };

  const svc = new MemoryService({ db: mockDb, ai: mockAiFailing });
  const ids = await svc.saveMemories("user-1", [
    { type: "semantic", content: "Fact saved without embedding", importance: 1 },
  ], { sourceMessageId: "msg-123" });

  assert.equal(ids.length, 1);
  assert.equal(ids[0], "mem-no-emb");
  assert.equal(insertedVal?.content, "Fact saved without embedding");
  assert.equal(insertedVal?.embedding, null);
  assert.equal(insertedVal?.sourceMessageId, "msg-123");
});

