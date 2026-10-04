import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../auth.js";
import { getOrCreateDbUser } from "./api.js";
import { db, tasks, memories, messages } from "@mind/db";
import { eq, desc, and, count, inArray, isNotNull, gt, asc } from "drizzle-orm";

export default async function miniappRoutes(app: FastifyInstance) {
  // Use centralized HMAC authentication hook
  app.addHook("preHandler", requireAuth);
  
  // Resolve internal database user
  app.addHook("preHandler", async (request) => {
    if (request.user && typeof request.user.id === "number") {
      const dbUser = await getOrCreateDbUser(request.user.id);
      (request as any).dbUser = dbUser;
      (request as any).user = dbUser;
    }
  });

  app.get("/home", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    // active tasks count (inbox and in_progress)
    const tasksCountResult = await db.select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), inArray(tasks.status, ['inbox', 'in_progress'])));
    const activeTasksCount = tasksCountResult[0]?.count || 0;
    
    // ближайший будущий deadline
    const nextDeadlineTask = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, user.id),
          inArray(tasks.status, ['inbox', 'in_progress']),
          isNotNull(tasks.deadline),
          gt(tasks.deadline, new Date())
        )
      )
      .orderBy(asc(tasks.deadline))
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

    let importance = 1;
    if (typeof body.importance === "number") {
      importance = Math.round(body.importance <= 1 && body.importance > 0 ? body.importance * 10 : body.importance);
    }
    if (isNaN(importance) || importance < 1) importance = 1;
    if (importance > 10) importance = 10;

    const inserted = await db.insert(memories).values({
      userId: user.id,
      type: body.type || "semantic",
      content,
      importance,
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
