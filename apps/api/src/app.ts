import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import miniappRoutes from "./routes/miniapp.js";
import { pool } from "@mind/db";

/**
 * Builds and configures the Fastify server instance.
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  const isProd = process.env.NODE_ENV === "production";
  
  app.register(cors, {
    origin: isProd 
      ? process.env.WEB_APP_URL || false 
      : [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
  });

  app.get("/health", async (_request, reply) => {
    try {
      // Simple DB readiness check
      await pool.query("SELECT 1");
      return reply.status(200).send({ status: "alive", db: "connected" });
    } catch (err) {
      app.log.error(err, "Health check failed");
      return reply.status(503).send({ status: "unhealthy", db: "disconnected" });
    }
  });

  app.register(miniappRoutes, { prefix: "/api/miniapp" });

  return app;
}
