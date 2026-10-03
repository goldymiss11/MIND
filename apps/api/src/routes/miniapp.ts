import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { validateWebAppData, parseInitData } from "../lib/auth.js";
import { db, users, tasks, memories } from "@mind/db";
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
    if (body.status) updateData.status = body.status;
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

  app.get("/artifacts", async (_request: FastifyRequest, reply: FastifyReply) => {
    // Artifact generation logic is likely not fully implemented, returning empty for now
    return reply.send([]);
  });
}
