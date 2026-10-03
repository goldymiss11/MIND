import Fastify, { type FastifyInstance } from "fastify";

/**
 * Builds and configures the Fastify server instance.
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  app.get("/health", async (_request, reply) => {
    return reply.status(200).send({ status: "MIND API is alive" });
  });

  return app;
}
