import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import miniappRoutes from "./routes/miniapp.js";
import apiRoutes from "./routes/api.js";
import { pool } from "@mind/db";

/**
 * Builds and configures the Fastify server instance.
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  const isProd = process.env.NODE_ENV === "production";
  const webAppOrigin = process.env.WEB_APP_URL || process.env.WEBAPP_URL;
  
  app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps, server-to-server or curl)
      if (!origin) {
        cb(null, true);
        return;
      }
      if (!isProd || /^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        cb(null, true);
        return;
      }
      if (webAppOrigin && (origin === webAppOrigin.replace(/\/+$/, "") || origin.startsWith(webAppOrigin.replace(/\/+$/, "")))) {
        cb(null, true);
        return;
      }
      try {
        if (/\.onrender\.com$/.test(new URL(origin).hostname)) {
          cb(null, true);
          return;
        }
      } catch {
        // invalid origin url
      }
      cb(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
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

  app.register(apiRoutes, { prefix: "/api" });
  app.register(miniappRoutes, { prefix: "/api/miniapp" });

  return app;
}
