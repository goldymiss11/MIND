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

test("OrchestratorService: rejects empty input with validation_failure", async () => {
  const svc = new OrchestratorService({ db: {} as any, ai: {} as any });
  const res = await svc.execute({ telegramUserId: 123, text: "   " });
  assert.equal(res.status, "failed");
  assert.equal(res.errorCategory, "validation_failure");
  assert.ok(res.response.includes("пустое"));
});

test("OrchestratorService: rejects oversized input with validation_failure", async () => {
  const svc = new OrchestratorService({ db: {} as any, ai: {} as any });
  const hugeText = "a".repeat(16001);
  const res = await svc.execute({ telegramUserId: 123, text: hugeText });
  assert.equal(res.status, "failed");
  assert.equal(res.errorCategory, "validation_failure");
  assert.ok(res.response.includes("превышает"));
});

test("OrchestratorService: blocks dangerous/confirmation-required tools without explicit confirmation", async () => {
  // Register a mock tool requiring confirmation
  const testToolName = "danger_action_" + Date.now();
  let executed = false;
  toolRegistry.register({
    name: testToolName,
    description: "Dangerous tool requiring user confirmation",
    inputSchema: { type: "OBJECT" },
    sideEffect: "external_write",
    requiresConfirmation: true,
    execute: async () => {
      executed = true;
      return { success: true };
    }
  });

  const mockDb: any = {
    query: {
      users: { findFirst: async () => ({ id: "user-1", telegramId: 123 }) },
      conversations: { findFirst: async () => ({ id: "conv-1", userId: "user-1", telegramChatId: 123 }) },
    },
    insert: () => ({ values: () => ({ returning: async () => [{ id: "msg-1" }] }) }),
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [] }), limit: async () => [] }) }) }),
  };

  const mockAi: any = {
    generateStructured: async () => ({ result: { intent: "chat", hasMemory: false, memories: [], hasTask: false, tasks: [] } }),
    generateEmbedding: async () => ({ result: [0.1] }),
    generateText: async (prompt: string, opts: any) => {
      if (opts.history && opts.history.length > 0) {
        // Second call after tool response
        return { result: "Действие требует подтверждения.", functionCalls: [] };
      }
      return {
        result: "",
        functionCalls: [{ name: testToolName, args: {} }]
      };
    }
  };

  const svc = new OrchestratorService({ db: mockDb, ai: mockAi });
  const res = await svc.execute({ telegramUserId: 123, text: "Выполни опасное действие" });

  assert.equal(executed, false);
  assert.equal(res.errorCategory, "confirmation_required");
  assert.ok(res.warnings.some(w => w.category === "confirmation_required"));

  // Now execute WITH confirmation
  const resConfirmed = await svc.execute({
    telegramUserId: 123,
    text: "Выполни опасное действие",
    confirmedToolCalls: [testToolName]
  });
  assert.equal(executed, true);
});

test("OrchestratorService: handles race condition gracefully when user/conversation insert conflicts", async () => {
  let userQueryCount = 0;
  let userInserted = false;
  let convQueryCount = 0;

  const mockDb: any = {
    query: {
      users: {
        findFirst: async () => {
          userQueryCount++;
          // First time returns null (simulating concurrent insert), second time returns existing user
          return userQueryCount > 1 ? { id: "user-race-1", telegramId: 999 } : null;
        }
      },
      conversations: {
        findFirst: async () => {
          convQueryCount++;
          return convQueryCount > 1 ? { id: "conv-race-1", userId: "user-race-1", telegramChatId: 999 } : null;
        }
      },
    },
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            // Simulates conflict: nothing returned
            return [];
          }
        }),
        returning: async () => [{ id: "msg-1" }]
      })
    }),
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [] }), limit: async () => [] }) }) }),
  };

  const mockAi: any = {
    generateStructured: async () => ({ result: { intent: "chat", hasMemory: false, memories: [], hasTask: false, tasks: [] } }),
    generateEmbedding: async () => ({ result: [0.1] }),
    generateText: async () => ({ result: "Race condition survived!", functionCalls: [] })
  };

  const svc = new OrchestratorService({ db: mockDb, ai: mockAi });
  const res = await svc.execute({ telegramUserId: 999, text: "Hello from race condition" });

  assert.equal(res.status, "success");
  assert.equal(res.response, "Race condition survived!");
  assert.ok(userQueryCount >= 2);
  assert.ok(convQueryCount >= 2);
});

test("OrchestratorService: degrades gracefully when memory retrieval or saving fails", async () => {
  const mockDb: any = {
    query: {
      users: { findFirst: async () => ({ id: "user-1", telegramId: 123 }) },
      conversations: { findFirst: async () => ({ id: "conv-1", userId: "user-1", telegramChatId: 123 }) },
    },
    insert: () => ({ values: () => ({ returning: async () => [{ id: "msg-1" }] }) }),
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [] }), limit: async () => [] }) }) }),
  };

  const mockAi: any = {
    generateStructured: async () => ({
      result: {
        intent: "chat",
        hasMemory: true,
        memories: [{ type: "preference", content: "Likes testing" }],
        hasTask: false,
        tasks: []
      }
    }),
    generateText: async () => ({ result: "Answer despite memory failure", functionCalls: [] })
  };

  const mockMemory: any = {
    saveMemories: async () => {
      throw new Error("Memory database connection timeout");
    },
    retrieveRelevantMemories: async () => {
      throw new Error("Vector embeddings quota exceeded");
    }
  };

  const svc = new OrchestratorService({ db: mockDb, ai: mockAi, memory: mockMemory });
  const res = await svc.execute({ telegramUserId: 123, text: "I like testing" });

  assert.equal(res.status, "partial");
  assert.equal(res.response, "Answer despite memory failure");
  assert.ok(res.warnings.some(w => w.message.includes("Memory database connection timeout")));
  assert.ok(res.warnings.some(w => w.message.includes("Vector embeddings quota exceeded")));
});

test("invokeSkillTool: rejects empty output without fake-success, logs AI run correctly", async () => {
  const { invokeSkillTool } = await import("../src/tools/definitions.js");
  const artifacts: any[] = [];
  let loggedAction = "";
  let loggedModel = "";

  const mockContextEmpty: any = {
    ai: {
      generateText: async () => ({ result: "   ", model: "gemini-3.5-flash" })
    },
    generatedArtifacts: artifacts,
    logAiRun: async (action: string, res: any) => {
      loggedAction = action;
      loggedModel = res.model;
    }
  };

  const emptyRes = await invokeSkillTool.execute(
    { skillName: "document-generation", prompt: "Make document" },
    mockContextEmpty
  );

  assert.equal(emptyRes.success, false);
  assert.ok(emptyRes.error?.includes("пустой"));
  assert.equal(artifacts.length, 0);

  // Now test with non-empty content
  const mockContextValid: any = {
    ai: {
      generateText: async () => ({ result: "# Real Markdown Document", model: "gemini-3.5-flash" })
    },
    generatedArtifacts: artifacts,
    logAiRun: async (action: string, res: any) => {
      loggedAction = action;
      loggedModel = res.model;
    }
  };

  const validRes = await invokeSkillTool.execute(
    { skillName: "document-generation", prompt: "Make document" },
    mockContextValid
  );

  assert.equal(validRes.success, true);
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0]?.content, "# Real Markdown Document");
  assert.ok(loggedAction.includes("document-generation"));
  assert.equal(loggedModel, "gemini-3.5-flash");
});

test("OrchestratorService: intent=research enables googleSearch, adds untrusted guardrail, formats sources block, and returns citations", async () => {
  let passedOptions: any = null;
  const mockDb: any = {
    query: {
      users: { findFirst: async () => ({ id: "user-1", telegramId: 123 }) },
      conversations: { findFirst: async () => ({ id: "conv-1", userId: "user-1", telegramChatId: 123 }) },
    },
    insert: () => ({ values: () => ({ returning: async () => [{ id: "msg-1" }] }) }),
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [] }), limit: async () => [] }) }) }),
  };

  const mockAi: any = {
    generateStructured: async () => ({
      result: {
        intent: "research",
        hasMemory: false,
        memories: [],
        hasTask: false,
        tasks: []
      }
    }),
    generateEmbedding: async () => ({ result: [0.1] }),
    generateText: async (prompt: string, opts: any) => {
      passedOptions = opts;
      return {
        result: "Согласно последним исследованиям, сверхпроводимость была подтверждена.",
        citations: [
          { url: "https://nature.com/articles/supercond", title: "Nature Superconductivity" },
          { url: "https://arxiv.org/abs/1234", title: "arXiv Preprint" }
        ],
        model: "gemini-3.5-flash"
      };
    }
  };

  const svc = new OrchestratorService({ db: mockDb, ai: mockAi });
  const res = await svc.execute({ telegramUserId: 123, text: "Что нового в физике сверхпроводников?" });

  assert.equal(res.status, "success");
  // Check that googleSearch was enabled
  assert.equal(passedOptions.googleSearch, true);
  // Check security guardrail against prompt injection in system instruction
  assert.ok(passedOptions.systemInstruction.includes("untrusted input"));
  assert.ok(passedOptions.systemInstruction.includes("prompt injection"));
  // Check sources block formatted in response
  assert.ok(res.response.includes("Согласно последним исследованиям"));
  assert.ok(res.response.includes("Источники:"));
  assert.ok(res.response.includes("• Nature Superconductivity — https://nature.com/articles/supercond"));
  assert.ok(res.response.includes("• arXiv Preprint — https://arxiv.org/abs/1234"));
  // Check citations returned in structured result
  assert.ok(Array.isArray(res.citations));
  assert.equal(res.citations.length, 2);
  assert.equal(res.citations[0]?.url, "https://nature.com/articles/supercond");
});

test("OrchestratorService: intent=chat does not enable googleSearch and does not append sources block", async () => {
  let passedOptions: any = null;
  const mockDb: any = {
    query: {
      users: { findFirst: async () => ({ id: "user-1", telegramId: 123 }) },
      conversations: { findFirst: async () => ({ id: "conv-1", userId: "user-1", telegramChatId: 123 }) },
    },
    insert: () => ({ values: () => ({ returning: async () => [{ id: "msg-1" }] }) }),
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [] }), limit: async () => [] }) }) }),
  };

  const mockAi: any = {
    generateStructured: async () => ({
      result: {
        intent: "chat",
        hasMemory: false,
        memories: [],
        hasTask: false,
        tasks: []
      }
    }),
    generateEmbedding: async () => ({ result: [0.1] }),
    generateText: async (prompt: string, opts: any) => {
      passedOptions = opts;
      return {
        result: "Привет! Чем могу помочь?",
        model: "llama-3.3-70b"
      };
    }
  };

  const svc = new OrchestratorService({ db: mockDb, ai: mockAi });
  const res = await svc.execute({ telegramUserId: 123, text: "Привет!" });

  assert.equal(res.status, "success");
  assert.equal(passedOptions.googleSearch, false);
  assert.ok(!passedOptions.systemInstruction.includes("untrusted input"));
  assert.ok(!res.response.includes("Источники:"));
  assert.equal(res.citations, undefined);
});

test("deleteTaskTool: deletes task by taskId or taskTitle", async () => {
  const { deleteTaskTool } = await import("../src/tools/definitions.js");
  let deletedId = "";
  const mockDb: any = {
    query: {
      tasks: {
        findFirst: async () => ({ id: "task-uuid-1", title: "Встреча с инвесторами" })
      }
    },
    select: () => ({
      from: () => ({
        where: async () => [{ id: "task-uuid-2", title: "Купить молоко" }]
      })
    }),
    delete: () => ({
      where: async () => {
        deletedId = "deleted";
      }
    })
  };

  const res1 = await deleteTaskTool.execute(
    { taskId: "task-uuid-1" },
    { db: mockDb, user: { id: "user-1" } }
  );
  assert.equal(res1.success, true);
  assert.ok(res1.message.includes("Встреча с инвесторами"));

  const res2 = await deleteTaskTool.execute(
    { taskTitle: "молоко" },
    { db: mockDb, user: { id: "user-1" } }
  );
  assert.equal(res2.success, true);
  assert.ok(res2.message.includes("Купить молоко"));
});

test("invokeSkillTool: generates binary DOCX buffer when format='docx' requested", async () => {
  const { invokeSkillTool } = await import("../src/tools/definitions.js");
  const artifacts: any[] = [];
  const mockContext: any = {
    ai: {
      generateText: async () => ({
        result: "# Моя статья\n\nЭто текст в формате Markdown для **Word**.",
        model: "gemini-2.5-flash"
      })
    },
    generatedArtifacts: artifacts,
    logAiRun: async () => {}
  };

  const res = await invokeSkillTool.execute(
    { skillName: "document-generation", prompt: "Сделай статью в формате docx", format: "docx" },
    mockContext
  );

  assert.equal(res.success, true);
  assert.equal(artifacts.length, 1);
  assert.ok(artifacts[0]?.name.endsWith(".docx"));
  assert.ok(Buffer.isBuffer(artifacts[0]?.content));
  assert.ok(artifacts[0]?.content.length > 500);
});

test("OrchestratorService: contains strict artifact routing instructions in system prompt", async () => {
  let capturedSystemInstruction = "";
  const mockDb: any = {
    query: {
      users: { findFirst: async () => ({ id: "user-1", telegramId: 123 }) },
      conversations: { findFirst: async () => ({ id: "conv-1", userId: "user-1", telegramChatId: "123" }) },
    },
    insert: () => ({ values: () => ({ returning: async () => [{ id: "msg-1" }] }) }),
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [] }), limit: async () => [] }) }) })
  };

  const mockAi: any = {
    generateStructured: async () => ({
      result: { intent: "chat", hasMemory: false, memories: [], hasTask: false, tasks: [] },
      usage: {}
    }),
    generateEmbedding: async () => ({ result: [0.1], usage: {} }),
    generateText: async (_text: string, options: any) => {
      capturedSystemInstruction = options?.systemInstruction || "";
      return { result: "Готово", usage: {} };
    }
  };

  const svc = new OrchestratorService({ db: mockDb, ai: mockAi });
  await svc.execute({ telegramUserId: 123, text: "Сделай презентацию о космосе" });

  assert.ok(
    capturedSystemInstruction.includes(
      "If the user requests a presentation, you MUST use the artifact generation tool with 'pptx' format. If they request a spreadsheet/table, you MUST use 'xlsx' format."
    )
  );
  assert.ok(capturedSystemInstruction.includes("format='pptx'"));
  assert.ok(capturedSystemInstruction.includes("format='xlsx'"));
  assert.ok(capturedSystemInstruction.includes("Do NOT output markdown tables if the user asks for a table/excel"));
});




