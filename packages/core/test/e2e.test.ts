import { test, after } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { eq } from "drizzle-orm";
import { createDatabaseClient, schema } from "@mind/db";
import { OrchestratorService } from "../src/services/orchestrator.service.js";
import { markdownToDocx } from "../src/artifacts/docx.renderer.js";

// The main path against a real database: runs when TEST_DATABASE_URL points at a migrated one.
const url = process.env["TEST_DATABASE_URL"];

test("e2e: a sent file is stored, edited on request and comes back as a new docx", { skip: !url }, async () => {
  const { db, pool } = createDatabaseClient({ connectionString: url });
  after(() => pool.end());

  const telegramId = Math.floor(Math.random() * 1e12) + 1e9;
  const ai: any = {
    generateStructured: async () => ({
      result: { intent: "chat", hasMemory: false, memories: [], hasTask: true, tasks: [{ title: "Позвонить", deadline: "2030-01-15T15:00:00", recurrence: "weekly" }] },
      usage: {},
    }),
    generateEmbedding: async () => {
      throw new Error("embeddings are not needed here");
    },
    generateText: async (prompt: string, options: any) => {
      if (!options.tools) return { result: "# Отчёт\n\n## Введение\n\nНовый текст документа.", usage: {} };
      return prompt
        ? { result: "", functionCalls: [{ id: "1", name: "edit_artifact", args: { instruction: "обнови текст" } }], usage: {} }
        : { result: "Готово", usage: {} };
    },
  };
  const memory: any = { retrieveRelevantMemories: async () => [], saveMemories: async () => [] };
  const service = new OrchestratorService({ db, ai, memory });

  try {
    const upload = await markdownToDocx("# Отчёт\n\n## Введение\n\nСтарый текст документа.");
    const reply: any = await service.handleIncomingFile(
      telegramId,
      { name: "отчёт.docx", data: upload, caption: "обнови текст" },
      telegramId
    );

    assert.equal(reply.text, "Готово");
    assert.match(reply.artifacts[0].name, /^Отчёт_\d+\.docx$/);
    const doc = await (await JSZip.loadAsync(reply.artifacts[0].content)).file("word/document.xml")!.async("text");
    assert.ok(doc.includes("Новый текст"));

    const user = await db.query.users.findFirst({ where: eq(schema.users.telegramId, telegramId) });
    const stored = await db
      .select({ name: schema.artifacts.name, data: schema.artifactFiles.data })
      .from(schema.artifacts)
      .leftJoin(schema.artifactFiles, eq(schema.artifactFiles.artifactId, schema.artifacts.id))
      .where(eq(schema.artifacts.userId, user!.id));
    assert.equal(stored.length, 2, "the upload and the edited version are both kept");
    for (const file of stored) {
      assert.equal(file.data?.subarray(0, 2).toString(), "PK", "binary survives the round trip");
    }

    const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.userId, user!.id));
    assert.equal(task?.recurrence, "weekly");
    assert.equal(task?.deadline?.toISOString(), "2030-01-15T12:00:00.000Z", "15:00 in the default Moscow timezone");
  } finally {
    await db.delete(schema.users).where(eq(schema.users.telegramId, telegramId));
  }
});
