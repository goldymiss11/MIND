import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../auth.js";
import { db, tasks, memories, artifacts, artifactFiles, users } from "@mind/db";
import { eq, desc, and, count, inArray, isNotNull, gt, gte, asc, ilike, sql } from "drizzle-orm";
import { Api, InputFile } from "grammy";
import { isValidTimezone } from "@mind/shared";
import { MemoryService } from "@mind/core";

const RECURRENCES = ["daily", "weekly", "monthly"];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Resolves internal database user by Telegram ID.
 * Auto-provisions user on first authenticated request.
 */
export async function getOrCreateDbUser(telegramId: number): Promise<typeof users.$inferSelect> {
  const existing = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
  if (existing[0]) return existing[0];

  const inserted = await db.insert(users).values({ telegramId }).onConflictDoNothing().returning();
  if (inserted[0]) return inserted[0];

  // Lost a race with a concurrent first request.
  const retry = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
  if (retry[0]) return retry[0];

  throw new Error(`Failed to resolve or create database user for telegramId ${telegramId}`);
}

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

  app.get("/me", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    return reply.send({ timezone: user.timezone, digestEnabled: user.digestEnabled });
  });

  app.patch("/me", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = (request.body as any) ?? {};

    const update: { timezone?: string; digestEnabled?: boolean } = {};
    if (body.timezone !== undefined) {
      if (typeof body.timezone !== "string" || !isValidTimezone(body.timezone)) {
        return reply.status(400).send({ error: "Invalid timezone" });
      }
      update.timezone = body.timezone;
    }
    if (typeof body.digestEnabled === "boolean") update.digestEnabled = body.digestEnabled;

    if (Object.keys(update).length > 0) {
      await db.update(users).set({ ...update, updatedAt: new Date() }).where(eq(users.id, user.id));
    }
    return reply.send({ timezone: user.timezone, digestEnabled: user.digestEnabled, ...update });
  });

  app.get("/search", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const q = String((request.query as any)?.q ?? "").trim();
    if (!q) return reply.send({ tasks: [], memories: [], artifacts: [] });

    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const [foundTasks, foundMemories, foundArtifacts] = await Promise.all([
      db.select({ id: tasks.id, title: tasks.title, status: tasks.status, deadline: tasks.deadline })
        .from(tasks)
        .where(and(eq(tasks.userId, user.id), ilike(tasks.title, pattern)))
        .limit(5),
      db.select({ id: memories.id, type: memories.type, content: memories.content })
        .from(memories)
        .where(and(eq(memories.userId, user.id), ilike(memories.content, pattern)))
        .limit(5),
      db.select({ id: artifacts.id, name: artifacts.name, type: artifacts.type })
        .from(artifacts)
        .where(and(eq(artifacts.userId, user.id), ilike(artifacts.name, pattern)))
        .limit(5),
    ]);
    return reply.send({ tasks: foundTasks, memories: foundMemories, artifacts: foundArtifacts });
  });

  app.get("/home", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    // active tasks count (inbox and in_progress)
    const tasksCountResult = await db.select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), inArray(tasks.status, ['inbox', 'in_progress'])));
    const activeTasksCount = tasksCountResult[0]?.count || 0;
    
    // ближайшие будущие дедлайны
    const upcomingTasks = await db.select()
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
      .limit(3);

    const [completedResult, memoriesResult, artifactsResult] = await Promise.all([
      db.select({ count: count() }).from(tasks).where(
        and(
          eq(tasks.userId, user.id),
          eq(tasks.status, 'completed'),
          gte(tasks.completedAt, new Date(Date.now() - WEEK_MS))
        )
      ),
      db.select({ count: count() }).from(memories).where(eq(memories.userId, user.id)),
      db.select({ count: count() }).from(artifacts).where(eq(artifacts.userId, user.id)),
    ]);
      
    // recent memories
    const recentMemories = await db.select()
      .from(memories)
      .where(eq(memories.userId, user.id))
      .orderBy(desc(memories.createdAt))
      .limit(5);
      
    // recent artifacts
    let recentArtifacts: any[] = [];
    try {
      recentArtifacts = await db.select()
        .from(artifacts)
        .where(eq(artifacts.userId, user.id))
        .orderBy(desc(artifacts.createdAt))
        .limit(3);
    } catch (artErr) {
      app.log.warn(artErr, "Failed to load recent artifacts for home");
    }
      
    return reply.send({
      tasksCount: activeTasksCount,
      completedThisWeek: completedResult[0]?.count || 0,
      memoriesCount: memoriesResult[0]?.count || 0,
      artifactsCount: artifactsResult[0]?.count || 0,
      upcomingTasks: upcomingTasks.map(t => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline?.toISOString(),
        recurrence: t.recurrence,
      })),
      recentMemories: recentMemories.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content,
        createdAt: m.createdAt?.toISOString()
      })),
      recentArtifacts: recentArtifacts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        createdAt: a.createdAt?.toISOString()
      }))
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
      recurrence: deadlineDate && RECURRENCES.includes(body.recurrence) ? body.recurrence : null,
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
    if (body.recurrence !== undefined) {
      updateData.recurrence = RECURRENCES.includes(body.recurrence) ? body.recurrence : null;
    }
    if (body.deadline !== undefined) {
      const parsed = body.deadline ? new Date(body.deadline) : null;
      if (parsed === null || !isNaN(parsed.getTime())) {
        updateData.deadline = parsed;
        // A moved deadline has to fire again.
        updateData.lastRemindedAt = null;
      }
    }
    
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

    // MemoryService adds the embedding the AI's search relies on and merges near-duplicates.
    const [id] = await new MemoryService().saveMemories(user.id, [
      { type: body.type || "semantic", content, importance: body.importance ?? 8 },
    ]);
    const saved = await db.select().from(memories).where(and(eq(memories.id, id!), eq(memories.userId, user.id))).limit(1);

    return reply.status(201).send(saved[0]);
  });

  app.delete("/memories/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;

    if (!id) return reply.status(400).send({ error: "Memory ID is required" });

    await db.delete(memories).where(and(eq(memories.id, id), eq(memories.userId, user.id)));
    return reply.send({ success: true });
  });

  app.get("/artifacts", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (!user?.id) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const userArtifacts = await db.select({
        id: artifacts.id,
        name: artifacts.name,
        type: artifacts.type,
        createdAt: artifacts.createdAt,
        // A preview is enough here: documents can run to hundreds of kilobytes.
        content: sql<string | null>`left(${artifacts.content}, 4000)`,
      })
        .from(artifacts)
        .where(eq(artifacts.userId, user.id))
        .orderBy(desc(artifacts.createdAt));

      return reply.send(userArtifacts || []);
    } catch (err: any) {
      app.log.error(err, "Failed to load artifacts for user in miniapp");
      return reply.status(500).send({ error: "Failed to load artifacts" });
    }
  });

  // Telegram's webview cannot reliably save downloads, so the bot sends the file to the user's chat.
  app.post("/artifacts/:id/send", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;
    const token = process.env["TELEGRAM_BOT_TOKEN"];
    if (!token) return reply.status(500).send({ error: "Bot is not configured" });

    const rows = await db
      .select({ name: artifacts.name, content: artifacts.content, data: artifactFiles.data })
      .from(artifacts)
      .leftJoin(artifactFiles, eq(artifactFiles.artifactId, artifacts.id))
      .where(and(eq(artifacts.id, id), eq(artifacts.userId, user.id)))
      .limit(1);
    const artifact = rows[0];
    if (!artifact) return reply.status(404).send({ error: "Artifact not found" });

    // Text files have no stored binary: their content is the file. Binary files from
    // before file storage existed have neither, and their source is JSON or Markdown only.
    const isTextFile = !/\.(docx|pptx|xlsx|pdf)$/i.test(artifact.name);
    const body = artifact.data ?? (isTextFile && artifact.content ? Buffer.from(artifact.content, "utf-8") : null);
    if (!body) {
      return reply.status(410).send({ error: "Файл создан до появления хранилища. Найдите его в чате с ботом." });
    }

    await new Api(token).sendDocument(user.telegramId, new InputFile(body, artifact.name));
    return reply.send({ success: true });
  });

  app.delete("/artifacts/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;

    if (!id) return reply.status(400).send({ error: "Artifact ID is required" });

    try {
      await db.delete(artifacts).where(and(eq(artifacts.id, id), eq(artifacts.userId, user.id)));
      return reply.send({ success: true });
    } catch (err: any) {
      app.log.error(err, "Failed to delete artifact in miniapp");
      return reply.status(500).send({ error: "Failed to delete artifact" });
    }
  });
}
