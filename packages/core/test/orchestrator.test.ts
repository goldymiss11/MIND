import { test } from "node:test";
import assert from "node:assert";
import { OrchestratorService } from "../src/services/orchestrator.service.js";
import { toolRegistry } from "../src/tools/registry.js";
import { schema } from "@mind/db";

test("OrchestratorService: chat request (intent=chat) bounded loop", async () => {
  const mockDb: any = {
    query: {
      users: { findFirst: async () => ({ id: "user-1", telegramId: 123 }) },
      conversations: { findFirst: async () => ({ id: "conv-1", userId: "user-1", telegramChatId: "123" }) },
    },
    insert: () => ({
      values: () => ({ returning: async () => [{ id: "msg-1" }] })
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({ limit: async () => [] }),
          limit: async () => []
        })
      })
    })
  };

  const mockAi: any = {
    generateStructured: async (text: string, s: any) => {
       if (s.properties.goal) {
          return { result: { goal: "do it", steps: [] }, usage: {} };
       }
       return { 
          result: { intent: "chat", hasMemory: false, memories: [], hasTask: false, tasks: [] },
          usage: {}
       };
    },
    generateEmbedding: async () => ({ result: [0.1], usage: {} }),
    generateText: async () => {
       return { result: "Hello back!", usage: {} };
    }
  };

  const svc = new OrchestratorService({ db: mockDb, ai: mockAi });
  const res = await svc.execute({ telegramUserId: 123, text: "Hello" });

  assert.equal(res.status, "success");
  assert.equal(res.response, "Hello back!");
});

test("OrchestratorService: tasks and memories extract correctly, deduplication", async () => {
  let memoriesSearched = false;
  let memoriesUpdated = false;

  const mockDb: any = {
    query: {
      users: { findFirst: async () => ({ id: "user-1", telegramId: 123 }) },
      conversations: { findFirst: async () => ({ id: "conv-1", userId: "user-1", telegramChatId: "123" }) },
      projects: { findFirst: async () => ({ id: "proj-1", userId: "user-1", name: "Uni" }) },
    },
    insert: () => ({
      values: () => ({ returning: async () => [{ id: "new-id" }] })
    }),
    update: () => ({
      set: () => ({
         where: async () => { memoriesUpdated = true; }
      })
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({ limit: async () => { memoriesSearched = true; return [{ id: "mem-1", distance: 0.1 }]; } }),
          limit: async () => []
        })
      })
    })
  };

  const mockAi: any = {
    generateStructured: async (text: string, schema: any) => {
       return { 
          result: { 
             intent: "task", 
             hasMemory: true, 
             memories: [{ type: "semantic", content: "I like tests", importance: 1 }], 
             hasTask: true, 
             tasks: [{ title: "Run tests", projectName: "Uni" }] 
          },
          usage: {}
       };
    },
    generateEmbedding: async () => ({ result: [0.1], usage: {} }),
    generateText: async () => ({ result: "Done", usage: {} })
  };

  const svc = new OrchestratorService({ db: mockDb, ai: mockAi });
  const res = await svc.execute({ telegramUserId: 123, text: "Remember I like tests and remind me to Run tests" });
  
  assert.equal(res.createdTasks.length, 1);
  assert.equal(res.updatedMemories.length, 1);
  assert.ok(memoriesSearched);
  assert.ok(memoriesUpdated);
});

test("OrchestratorService: executes bounded tool loop and validates dependencies", async () => {
  const mockDb: any = {
    query: {
      users: { findFirst: async () => ({ id: "user-1", telegramId: 123 }) },
      conversations: { findFirst: async () => ({ id: "conv-1" }) },
    },
    insert: () => ({ values: () => ({ returning: async () => [{ id: "msg-1" }] }) }),
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [] }), limit: async () => [] }) }) }),
    update: () => ({ set: () => ({ where: async () => [{ status: "completed" }] }) })
  };

  let calls = 0;
  const mockAi: any = {
    generateStructured: async () => ({ result: { intent: "task", hasMemory: false, memories: [], hasTask: false, tasks: [] } }),
    generateEmbedding: async () => ({ result: [0.1] }),
    generateText: async () => {
      calls++;
      if (calls === 1) {
        return {
          result: "",
          functionCalls: [{ name: "update_task", args: { taskId: "task-123", status: "completed" } }]
        };
      }
      return { result: "Task updated", functionCalls: [] };
    }
  };

  const svc = new OrchestratorService({ db: mockDb, ai: mockAi });
  const res = await svc.execute({ telegramUserId: 123, text: "Complete task" });
  assert.equal(calls, 2);
  assert.equal(res.response, "Task updated");
});

test("OrchestratorService: detects infinite loops (repeated tool calls)", async () => {
  const mockDb: any = {
    query: {
       users: { findFirst: async () => ({ id: "user-1", telegramId: 123 }) },
       conversations: { findFirst: async () => ({ id: "conv-1" }) },
    },
    insert: () => ({ values: () => ({ returning: async () => [{ id: "msg-1" }] }) }),
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [] }), limit: async () => [] }) }) }),
    update: () => ({ set: () => ({ where: async () => [{ status: "completed" }] }) })
  };

  let aiCalls = 0;
  const mockAi: any = {
    generateStructured: async () => ({ result: { intent: "task", hasMemory: false, memories: [], hasTask: false, tasks: [] } }),
    generateEmbedding: async () => ({ result: [0.1] }),
    generateText: async () => {
      aiCalls++;
      // Return the exact same tool call repeatedly
      return {
        result: "",
        functionCalls: [{ name: "update_task", args: { taskId: "infinite-123", status: "completed" } }]
      };
    }
  };

  const svc = new OrchestratorService({ db: mockDb, ai: mockAi });
  const res = await svc.execute({ telegramUserId: 123, text: "Complete task" });
  
  // It should hit maxIterations (5)
  assert.equal(aiCalls, 5);
  assert.equal(res.status, "partial");
  assert.ok(res.warnings[0].message.includes("max iterations"));
});

test("OrchestratorService: Execution Plan generated for complex intent", async () => {
  let planRequested = false;
  const mockDb: any = {
    query: {
       users: { findFirst: async () => ({ id: "user-1", telegramId: 123 }) },
       conversations: { findFirst: async () => ({ id: "conv-1" }) },
    },
    insert: () => ({ values: () => ({ returning: async () => [{ id: "msg-1" }] }) }),
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [] }), limit: async () => [] }) }) }),
  };

  const mockAi: any = {
    generateStructured: async (text: string, schema: any) => {
       if (schema.properties.goal) {
         planRequested = true;
         return {
           result: {
             goal: "Solve world peace",
             steps: [
               { id: "1", type: "think", description: "Think hard" },
             ]
           }
         };
       }
       return { result: { intent: "complex", hasMemory: false, memories: [], hasTask: false, tasks: [] } };
    },
    generateEmbedding: async () => ({ result: [0.1] }),
    generateText: async () => {
       return { result: "Done thinking", functionCalls: [] };
    }
  };

  const svc = new OrchestratorService({ db: mockDb, ai: mockAi });
  await svc.execute({ telegramUserId: 123, text: "Help me" });
  assert.ok(planRequested);
});
