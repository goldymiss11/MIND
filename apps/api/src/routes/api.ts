import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../auth.js";
import { db, users, tasks, memories, artifacts } from "@mind/db";
import { eq, desc, and, inArray } from "drizzle-orm";

/**
 * Resolves internal database user by Telegram ID.
 * Auto-provisions user on first authenticated request.
 */
export async function getOrCreateDbUser(telegramId: number): Promise<typeof users.$inferSelect> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  try {
    const inserted = await db
      .insert(users)
      .values({ telegramId })
      .onConflictDoNothing()
      .returning();

    if (inserted[0]) {
      return inserted[0];
    }
  } catch {
    // Conflict on race condition
  }

  const retry = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);

  if (retry[0]) {
    return retry[0];
  }

  throw new Error(`Failed to resolve or create database user for telegramId ${telegramId}`);
}

export default async function apiRoutes(app: FastifyInstance) {
  // Apply requireAuth to all routes in this plugin
  app.addHook("preHandler", requireAuth);

  /**
   * GET /api/tasks
   * Returns active tasks for the authenticated user by default.
   * Supports ?all=true or ?status=<status> query params.
   */
  app.get("/tasks", async (request: FastifyRequest, reply: FastifyReply) => {
    const tgUser = request.user;
    if (!tgUser) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const dbUser = await getOrCreateDbUser(tgUser.id);
    const query = request.query as { all?: string; status?: string };

    const conditions = [eq(tasks.userId, dbUser.id)];

    if (query.status) {
      if (query.status !== "all") {
        conditions.push(eq(tasks.status, query.status));
      }
    } else if (query.all !== "true") {
      // By default return active tasks (inbox, in_progress)
      conditions.push(inArray(tasks.status, ["inbox", "in_progress"]));
    }

    const userTasks = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));

    return reply.send(userTasks);
  });

  /**
   * POST /api/tasks
   * Creates a new task for the authenticated user.
   */
  app.post("/tasks", async (request: FastifyRequest, reply: FastifyReply) => {
    const tgUser = request.user;
    if (!tgUser) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const dbUser = await getOrCreateDbUser(tgUser.id);
    const body = request.body as any;

    const title = body?.title?.trim();
    if (!title) {
      return reply.status(400).send({ error: "Task title is required" });
    }

    let deadlineDate: Date | null = null;
    if (body.deadline) {
      const parsed = new Date(body.deadline);
      if (!isNaN(parsed.getTime())) {
        deadlineDate = parsed;
      }
    }

    const inserted = await db
      .insert(tasks)
      .values({
        userId: dbUser.id,
        title,
        description: body.description?.trim() || null,
        priority: body.priority || "normal",
        status: body.status || "in_progress",
        deadline: deadlineDate,
      })
      .returning();

    return reply.status(201).send(inserted[0]);
  });

  /**
   * PATCH /api/tasks/:id
   * Updates task status or fields, strictly verifying user ownership.
   */
  app.patch("/tasks/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tgUser = request.user;
    if (!tgUser) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const dbUser = await getOrCreateDbUser(tgUser.id);
    const { id } = request.params as { id: string };
    const body = request.body as any;

    if (!id) {
      return reply.status(400).send({ error: "Task ID is required" });
    }

    const existing = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, dbUser.id)))
      .limit(1);

    if (!existing.length) {
      return reply.status(404).send({ error: "Task not found" });
    }

    const updateData: any = {};
    if (body.status) {
      updateData.status = body.status;
      updateData.completedAt = body.status === "completed" ? new Date() : null;
    }
    if (body.title) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description ? body.description.trim() : null;
    if (body.priority) updateData.priority = body.priority;
    if (body.deadline !== undefined) {
      updateData.deadline = body.deadline ? new Date(body.deadline) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return reply.send(existing[0]);
    }

    const updated = await db
      .update(tasks)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, dbUser.id)))
      .returning();

    return reply.send(updated[0]);
  });

  /**
   * DELETE /api/tasks/:id
   * Deletes a task, strictly verifying user ownership.
   */
  app.delete("/tasks/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tgUser = request.user;
    if (!tgUser) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const dbUser = await getOrCreateDbUser(tgUser.id);
    const { id } = request.params as { id: string };

    if (!id) {
      return reply.status(400).send({ error: "Task ID is required" });
    }

    const deleted = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, dbUser.id)))
      .returning();

    if (!deleted.length) {
      return reply.status(404).send({ error: "Task not found" });
    }

    return reply.send({ success: true, deletedId: id });
  });

  /**
   * GET /api/memories
   * Returns list of user's memories.
   */
  app.get("/memories", async (request: FastifyRequest, reply: FastifyReply) => {
    const tgUser = request.user;
    if (!tgUser) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const dbUser = await getOrCreateDbUser(tgUser.id);

    const userMemories = await db
      .select()
      .from(memories)
      .where(eq(memories.userId, dbUser.id))
      .orderBy(desc(memories.createdAt));

    return reply.send(userMemories);
  });

  /**
   * POST /api/memories
   * Creates a new memory record for the authenticated user.
   */
  app.post("/memories", async (request: FastifyRequest, reply: FastifyReply) => {
    const tgUser = request.user;
    if (!tgUser) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const dbUser = await getOrCreateDbUser(tgUser.id);
    const body = request.body as any;

    const content = body?.content?.trim();
    if (!content) {
      return reply.status(400).send({ error: "Memory content is required" });
    }

    let importance = 1;
    if (typeof body.importance === "number") {
      importance = Math.round(
        body.importance <= 1 && body.importance > 0 ? body.importance * 10 : body.importance
      );
    }
    if (isNaN(importance) || importance < 1) importance = 1;
    if (importance > 10) importance = 10;

    const inserted = await db
      .insert(memories)
      .values({
        userId: dbUser.id,
        type: body.type || "semantic",
        content,
        importance,
      })
      .returning();

    return reply.status(201).send(inserted[0]);
  });

  /**
   * DELETE /api/memories/:id
   * Deletes a memory record, strictly verifying user ownership.
   */
  app.delete("/memories/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tgUser = request.user;
    if (!tgUser) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const dbUser = await getOrCreateDbUser(tgUser.id);
    const { id } = request.params as { id: string };

    if (!id) {
      return reply.status(400).send({ error: "Memory ID is required" });
    }

    const deleted = await db
      .delete(memories)
      .where(and(eq(memories.id, id), eq(memories.userId, dbUser.id)))
      .returning();

    if (!deleted.length) {
      return reply.status(404).send({ error: "Memory not found" });
    }

    return reply.send({ success: true, deletedId: id });
  });

  /**
   * GET /api/artifacts
   * Returns list of user's generated artifacts.
   */
  app.get("/artifacts", async (request: FastifyRequest, reply: FastifyReply) => {
    const tgUser = request.user;
    if (!tgUser) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const dbUser = await getOrCreateDbUser(tgUser.id);

    try {
      const userArtifacts = await db
        .select()
        .from(artifacts)
        .where(eq(artifacts.userId, dbUser.id))
        .orderBy(desc(artifacts.createdAt));

      return reply.send(userArtifacts);
    } catch (err: any) {
      app.log.error(err, "Failed to load artifacts");
      return reply.status(500).send({ error: "Failed to load artifacts" });
    }
  });

  /**
   * DELETE /api/artifacts/:id
   * Deletes an artifact, strictly verifying user ownership.
   */
  app.delete("/artifacts/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tgUser = request.user;
    if (!tgUser) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const dbUser = await getOrCreateDbUser(tgUser.id);
    const { id } = request.params as { id: string };

    if (!id) {
      return reply.status(400).send({ error: "Artifact ID is required" });
    }

    try {
      const deleted = await db
        .delete(artifacts)
        .where(and(eq(artifacts.id, id), eq(artifacts.userId, dbUser.id)))
        .returning();

      if (!deleted.length) {
        return reply.status(404).send({ error: "Artifact not found" });
      }

      return reply.send({ success: true, deletedId: id });
    } catch (err: any) {
      app.log.error(err, "Failed to delete artifact");
      return reply.status(500).send({ error: "Failed to delete artifact" });
    }
  });
}
