import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { validateWebAppData, parseInitData } from "../lib/auth.js";
import { db, users, tasks, memories, messages } from "@mind/db";
import { eq, desc, and, count } from "drizzle-orm";

export default async function miniappRoutes(app: FastifyInstance) {
  
  // Middleware for authentication
  app.decorateRequest("user", null);
  
  app.addHook("preHandler", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("tma ")) {
      return reply.status(401).send({ error: "Missing or invalid authorization header" });
    }
    
    const initData = authHeader.substring(4);
    const botToken = process.env["TELEGRAM_BOT_TOKEN"];
    
    if (!botToken) {
      request.log.error("TELEGRAM_BOT_TOKEN is not configured");
      return reply.status(500).send({ error: "Internal server error" });
    }
    
    const isValid = validateWebAppData(initData, botToken);
    
    if (!isValid) {
      return reply.status(403).send({ error: "Invalid Telegram auth data" });
    }
    
    const tgUser = parseInitData(initData);
    if (!tgUser || !tgUser.id) {
      return reply.status(403).send({ error: "Missing user data" });
    }
    
    // Find or create user
    const tgId = Number(tgUser.id);
    let userList = await db.select().from(users).where(eq(users.telegramId, tgId)).limit(1);
    
    let user = userList[0];
    if (!user) {
      const inserted = await db.insert(users).values({ telegramId: tgId }).returning();
      user = inserted[0];
    }
    
    (request as any).user = user;
  });

  app.get("/home", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    // active tasks count
    const tasksCountResult = await db.select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), eq(tasks.status, 'in_progress')));
    const activeTasksCount = tasksCountResult[0]?.count || 0;
    
    // ближайший deadline
    const nextDeadlineTask = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, user.id),
          eq(tasks.status, 'in_progress')
        )
      )
      .orderBy(tasks.deadline)
      .limit(1);
      
    // recent memories
    const recentMemories = await db.select()
      .from(memories)
      .where(eq(memories.userId, user.id))
      .orderBy(desc(memories.createdAt))
      .limit(5);
      
    return reply.send({
      tasksCount: activeTasksCount,
      upcomingDeadline: nextDeadlineTask[0]?.deadline?.toISOString() || null,
      recentMemories: recentMemories.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content,
        createdAt: m.createdAt?.toISOString()
      })),
      recentArtifacts: [] // TODO: read real artifacts when artifact storage is ready
    });
  });

  app.get("/tasks", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const userTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.userId, user.id))
      .orderBy(desc(tasks.createdAt));
      
    return reply.send(userTasks);
  });

  app.post("/tasks", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = request.body as any;

    const title = body?.title?.trim();
    if (!title) {
      return reply.status(400).send({ error: "Task title is required" });
    }

    let deadlineDate: Date | null = null;
    if (body.deadline) {
      const parsed = new Date(body.deadline);
      if (!isNaN(parsed.getTime())) deadlineDate = parsed;
    }

    const inserted = await db.insert(tasks).values({
      userId: user.id,
      title,
      description: body.description?.trim() || null,
      priority: body.priority || "normal",
      status: "in_progress",
      deadline: deadlineDate,
    }).returning();

    return reply.status(201).send(inserted[0]);
  });

  app.delete("/tasks/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;

    if (!id) return reply.status(400).send({ error: "Task ID is required" });

    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
    return reply.send({ success: true });
  });

  app.patch("/tasks/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;
    const body = request.body as any;
    
    if (!id) {
      return reply.status(400).send({ error: "Task ID is required" });
    }
    
    // find task to ensure ownership
    const taskList = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, user.id))).limit(1);
    if (!taskList.length) {
      return reply.status(404).send({ error: "Task not found" });
    }
    
    const updateData: any = {};
    if (body.status) {
      updateData.status = body.status;
      if (body.status === "completed") {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }
    }
    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    
    if (Object.keys(updateData).length === 0) {
      return reply.send(taskList[0]);
    }
    
    const updated = await db.update(tasks)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
      .returning();
      
    return reply.send(updated[0]);
  });

  app.get("/memories", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const userMemories = await db.select()
      .from(memories)
      .where(eq(memories.userId, user.id))
      .orderBy(desc(memories.createdAt));
      
    return reply.send(userMemories);
  });

  app.post("/memories", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = request.body as any;

    const content = body?.content?.trim();
    if (!content) {
      return reply.status(400).send({ error: "Memory content is required" });
    }

    const inserted = await db.insert(memories).values({
      userId: user.id,
      type: body.type || "semantic",
      content,
      importance: typeof body.importance === "number" ? body.importance : 0.8,
    }).returning();

    return reply.status(201).send(inserted[0]);
  });

  app.delete("/memories/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;

    if (!id) return reply.status(400).send({ error: "Memory ID is required" });

    await db.delete(memories).where(and(eq(memories.id, id), eq(memories.userId, user.id)));
    return reply.send({ success: true });
  });

  app.get("/artifacts", async (_request: FastifyRequest, reply: FastifyReply) => {
    // Find assistant messages with generated articles or structured long content
    const assistantMessages = await db.select()
      .from(messages)
      .where(eq(messages.role, "assistant"))
      .orderBy(desc(messages.createdAt))
      .limit(20);

    const artifactItems: any[] = [];
    for (const msg of assistantMessages) {
      const text = msg.content || "";
      if (text.startsWith("#") || text.includes("Статья") || text.includes("Как работает") || text.length > 500) {
        const titleMatch = text.match(/^#\s+(.+)$/m);
        const name = titleMatch && titleMatch[1] ? `${titleMatch[1].slice(0, 40)}.md` : `Document_${msg.id.slice(0, 8)}.md`;
        artifactItems.push({
          id: msg.id,
          name,
          type: "MARKDOWN",
          content: text,
          createdAt: msg.createdAt ? msg.createdAt.toISOString() : new Date().toISOString()
        });
      }
    }

    // Default item if none generated yet so the section is clear and usable
    if (artifactItems.length === 0) {
      artifactItems.push({
        id: "sample-doc-1",
        name: "Как работает AI.md",
        type: "MARKDOWN",
        content: "# Как работает AI\n\nИскусственный интеллект построен на нейросетевых моделях трансформаторов...",
        createdAt: new Date().toISOString()
      });
    }

    return reply.send(artifactItems);
  });
}
