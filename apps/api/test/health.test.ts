import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { pool } from "@mind/db";

test("GET /health returns status 200 with db connected", async () => {
  mock.method(pool, "query", async () => ({ rows: [{ "?column?": 1 }] }));
  
  const { buildServer } = await import("../src/app.js");
  const app = buildServer();

  const response = await app.inject({
    method: "GET",
    url: "/health",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.status, "alive");
  assert.equal(body.db, "connected");

  await app.close();
  mock.restoreAll();
});
