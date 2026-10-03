


import { eq, and, desc, asc, ne, cosineDistance } from "drizzle-orm";
import { db as defaultDb, schema, type MindDb } from "@mind/db";
import { AiService, AiMessage, Type, type TokenUsage } from "@mind/ai";
// @ts-ignore
import { v4 as uuidv4 } from "uuid";
import { ExecutionResult, ExecutionPlan } from "../types/execution.js";
import { toolRegistry } from "../tools/registry.js";

// Basic Types
export interface ExtractedMemoryItem { type: string; content: string; importance: number; }
export interface ExtractedTaskItem { title: string; description?: string | null; deadline?: string | null; priority?: string; projectName?: string | null; }

export const ANALYZER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    intent: { type: Type.STRING, enum: ["chat", "task", "memory", "research", "complex"] },
    hasMemory: { type: Type.BOOLEAN },
    memories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { type: { type: Type.STRING }, content: { type: Type.STRING }, importance: { type: Type.NUMBER } },
        required: ["type", "content"]
      }
    },
    hasTask: { type: Type.BOOLEAN },
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, deadline: { type: Type.STRING }, priority: { type: Type.STRING }, projectName: { type: Type.STRING } },
        required: ["title"]
      }
    }
  },
  required: ["intent", "hasMemory", "memories", "hasTask", "tasks"]
};

export const EXECUTION_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    goal: { type: Type.STRING },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["think", "retrieve_context", "tool_execution", "generate_artifact", "send_response"] },
          description: { type: Type.STRING },
          dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
          requiredTools: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["id", "type", "description"]
      }
    }
  },
  required: ["goal", "steps"]
};

export interface OrchestratorOptions {
  db?: MindDb;
  ai?: AiService;
}

export class OrchestratorService {
  private readonly db: MindDb;
  private readonly ai: AiService;

  constructor(options?: OrchestratorOptions | MindDb) {
    if (options && "query" in options) {
      this.db = options;
      this.ai = new AiService();
    } else if (options && ("db" in options || "ai" in options)) {
      this.db = options.db ?? defaultDb;
      this.ai = options.ai ?? new AiService();
    } else {
      this.db = defaultDb;
      this.ai = new AiService();
    }
  }

  private async logAiRun(userId: string, action: string, aiResponse: { model: string; usage: TokenUsage }): Promise<void> {
    await this.db.insert(schema.agentRuns).values({
      userId, action, model: aiResponse.model,
      promptTokens: aiResponse.usage?.promptTokens ?? 0,
      outputTokens: aiResponse.usage?.outputTokens ?? 0,
      totalTokens: aiResponse.usage?.totalTokens ?? 0,
    });
  }

  // Backwards compatibility for tests
  async handleIncomingMessage(telegramUserId: string | number, text: string, telegramChatId?: string | number) {
    const res = await this.execute({ telegramUserId, text, telegramChatId });
    return { text: res.response, artifacts: res.artifacts };
  }

  async execute(request: { telegramUserId: string | number, text: string, telegramChatId?: string | number }): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const artifacts: { name: string; content: string }[] = [];
    const createdTasks: string[] = [];
    const updatedMemories: string[] = [];
    const warnings: import("../types/execution.js").ExecutionWarning[] = [];

    const tgUserId = Number(request.telegramUserId);
    if (isNaN(tgUserId) || !Number.isSafeInteger(tgUserId)) {
      throw new Error(`Invalid telegramUserId: ${request.telegramUserId}`);
    }

    // 1. Get User and Conversation
    let user = await this.db.query.users.findFirst({ where: eq(schema.users.telegramId, tgUserId) });
    if (!user) {
      const insertedUser = await this.db.insert(schema.users).values({ telegramId: tgUserId }).returning();
      user = insertedUser[0];
    }
    const chatId = request.telegramChatId ? String(request.telegramChatId) : String(tgUserId);
    let conversation = await this.db.query.conversations.findFirst({
      where: and(eq(schema.conversations.userId, user!.id), eq(schema.conversations.telegramChatId, Number(chatId)))
    });
    if (!conversation) {
      const insertedConv = await this.db.insert(schema.conversations).values({ userId: user!.id, telegramChatId: Number(chatId) }).returning();
      conversation = insertedConv[0];
    }

    // 2. Persist Message
    await this.db.insert(schema.messages).values({
      conversationId: conversation!.id, role: "user", content: request.text
    }).returning();
    

    // 3. Intent & Context Extraction
    const systemPrompt = "Analyze the user message to extract personal memories and actionable tasks. If the request requires multiple steps (like writing a long document or running a script), set intent='complex'. Otherwise use 'chat', 'task', or 'memory'.";
    const analyzerRes = await this.ai.generateStructured<any>(request.text, ANALYZER_SCHEMA, { tier: "simple", systemInstruction: systemPrompt });
    await this.logAiRun(user!.id, "unified_analyzer", analyzerRes);
    const analyzerData = analyzerRes.result;
    
    // Process Memories with Deduplication
    if (analyzerData?.hasMemory && Array.isArray(analyzerData.memories)) {
      for (const mem of analyzerData.memories) {
        if (!mem.content) continue;
        const embRes = await this.ai.generateEmbedding(mem.content, { tier: "embedding" });
        await this.logAiRun(user!.id, "memory_embedding", embRes);

        // Deduplication
        const distanceSql = cosineDistance(schema.memories.embedding, embRes.result);
        const similarMemories = await this.db.select({ id: schema.memories.id, distance: distanceSql })
          .from(schema.memories).where(eq(schema.memories.userId, user!.id))
          .orderBy(asc(distanceSql)).limit(1);

        if (similarMemories.length > 0 && (similarMemories[0]?.distance as number) < 0.15) {
          await this.db.update(schema.memories).set({ content: mem.content, updatedAt: new Date() })
            .where(eq(schema.memories.id, similarMemories[0]!.id));
          updatedMemories.push(similarMemories[0]!.id as string);
        } else {
          const inserted = await this.db.insert(schema.memories).values({
            userId: user!.id, type: mem.type || "semantic", content: mem.content,
            importance: mem.importance || 1, confidence: 1.0, source: "conversation",
             embedding: embRes.result,
          }).returning();
          updatedMemories.push(inserted[0]!.id as string);
        }
      }
    }

    // Process Tasks
    if (analyzerData?.hasTask && Array.isArray(analyzerData.tasks)) {
      for (const task of analyzerData.tasks) {
        if (!task.title) continue;
        let projId = null;
        if (task.projectName) {
          const proj = await this.db.query.projects.findFirst({ where: and(eq(schema.projects.userId, user!.id), eq(schema.projects.name, task.projectName)) });
          if (proj) projId = proj.id;
          else {
            const newProj = await this.db.insert(schema.projects).values({ userId: user!.id, name: task.projectName }).returning();
            projId = newProj[0]!.id;
          }
        }
        
        let deadlineDate = null;
        if (task.deadline) {
          const pd = new Date(task.deadline);
          if (!isNaN(pd.getTime())) deadlineDate = pd;
        }

        const insertedTask = await this.db.insert(schema.tasks).values({
          userId: user!.id, title: task.title, description: task.description,
          deadline: deadlineDate, priority: task.priority || "normal", status: "inbox",
          projectId: projId, 
        }).returning();
        createdTasks.push(insertedTask[0]!.id as string);
      }
    }

    // 4. Execution Plan (if complex)
    let executionPlan: ExecutionPlan | null = null;
    if (analyzerData?.intent === "complex" || analyzerData?.intent === "research") {
      const planRes = await this.ai.generateStructured<ExecutionPlan>(request.text, EXECUTION_PLAN_SCHEMA, {
        tier: "complex",
        systemInstruction: "Create a bounded execution plan for this complex request. Limit to 3 steps max."
      });
      await this.logAiRun(user!.id, "execution_plan", planRes);
      executionPlan = planRes.result;
      
      // Validate plan
      if (!executionPlan.goal || !Array.isArray(executionPlan.steps) || executionPlan.steps.length > 5) {
        warnings.push({ message: "Plan validation failed or too many steps. Reverting to standard chat flow." });
        executionPlan = null;
      }
    }

    // 5. Context Pack Assembly
    const queryEmb = await this.ai.generateEmbedding(request.text, { tier: "embedding" });
    await this.logAiRun(user!.id, "query_embedding", queryEmb);

    const relevantMemories = await this.db.select().from(schema.memories).where(eq(schema.memories.userId, user!.id))
      .orderBy(asc(cosineDistance(schema.memories.embedding, queryEmb.result))).limit(5);

    const activeTasksDb = await this.db.select().from(schema.tasks).where(and(eq(schema.tasks.userId, user!.id), ne(schema.tasks.status, "completed"), ne(schema.tasks.status, "cancelled"))).limit(5);

    const rawHistory = await this.db.select().from(schema.messages).where(eq(schema.messages.conversationId, conversation!.id))
      .orderBy(desc(schema.messages.createdAt)).limit(10);
    const history: AiMessage[] = rawHistory.reverse().map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content ?? "",
    }));

    // 6. Bounded Execution Loop
    let loopInstruction = `Ты MIND — персональный AI-ассистент.
Текущее время: ${new Date().toISOString()}.`;
    if (relevantMemories.length > 0) {
      loopInstruction += "\n\nИзвестные факты о пользователе:\n" + relevantMemories.map(m => `- ${m.content}`).join("\n");
    }
    if (activeTasksDb.length > 0) {
      loopInstruction += "\n\nАктивные задачи:\n" + activeTasksDb.map(t => `- [${t.id}] ${t.title} (${t.status})`).join("\n");
    }
    if (executionPlan) {
      loopInstruction += "\n\nПлан выполнения:\n" + JSON.stringify(executionPlan, null, 2);
    }
    loopInstruction += "\n\nДоступные специализированные навыки:\n- document-generation";

    const aiTools = toolRegistry.getAiToolDeclarations();
    let currentHistory = [...history];
    let finalResponse = "";
    const maxIterations = 5;
    let iterations = 0;
    const toolCallHistory = new Set<string>();

    while (iterations < maxIterations) {
      iterations++;
      let chatRes;
      try {
        chatRes = await this.ai.generateText(iterations === 1 ? request.text : "", {
          tier: executionPlan ? "complex" : "standard",
          systemInstruction: loopInstruction,
          history: iterations === 1 ? history.slice(0, -1) : currentHistory,
          tools: [{ functionDeclarations: aiTools }]
        });
      } catch (e: any) {
        return { status: "failed", response: "", artifacts, createdTasks, updatedMemories, warnings: [{ message: e.message }], executionId, errorCategory: "provider_failure" };
      }
      await this.logAiRun(user!.id, "execution_loop", chatRes);

      if (chatRes.functionCalls && chatRes.functionCalls.length > 0) {
        const functionResponses = [];
        for (const call of chatRes.functionCalls) {
          const callKey = `${call.name}:${JSON.stringify(call.args)}`;
          if (toolCallHistory.has(callKey)) {
             functionResponses.push({ name: call.name, response: { success: false, error: "Duplicate tool call detected. Skipping." }, id: call.id });
             continue;
          }
          toolCallHistory.add(callKey);

          const tool = toolRegistry.get(call.name);
          if (!tool) {
            functionResponses.push({ name: call.name, response: { success: false, error: `Unknown tool: ${call.name}` }, id: call.id });
            continue;
          }
          try {
            const context = { db: this.db, user, ai: this.ai, generatedArtifacts: artifacts, logAiRun: this.logAiRun.bind(this) };
            const result = await tool.execute(call.args, context);
            functionResponses.push({ name: call.name, response: result, id: call.id });
          } catch (e: any) {
            functionResponses.push({ name: call.name, response: { success: false, error: e.message }, id: call.id });
          }
        }
        
        if (iterations === 1) {
           currentHistory.push({ role: "user", content: request.text });
        }
        currentHistory.push({ role: "assistant", toolCalls: chatRes.functionCalls, originalParts: chatRes.originalParts });
        currentHistory.push({ role: "tool", toolResponses: functionResponses });
      } else {
        finalResponse = chatRes.result;
        break;
      }
    }

    if (iterations >= maxIterations) {
      warnings.push({ message: "Execution loop reached max iterations." });
      if (!finalResponse) finalResponse = "Операция была прервана из-за достижения лимита шагов. " + (executionPlan ? "Возможно, план был слишком сложным." : "");
    }

    // 7. Persist Response
    await this.db.insert(schema.messages).values({
      conversationId: conversation!.id, role: "assistant", content: finalResponse
    });

    return {
      status: warnings.length > 0 ? "partial" : "success",
      response: finalResponse,
      artifacts,
      createdTasks,
      updatedMemories,
      warnings,
      executionId
    };
  }
}
