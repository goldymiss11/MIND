import { test } from "node:test";
import assert from "node:assert/strict";
import { markdownToTelegramHtml } from "../src/format.js";
import { JobQueue, RateLimiter } from "../src/jobs.js";

test("markdownToTelegramHtml: converts common markup", () => {
  assert.equal(markdownToTelegramHtml("**жирный** и *курсив*"), "<b>жирный</b> и <i>курсив</i>");
  assert.equal(markdownToTelegramHtml("## Заголовок"), "<b>Заголовок</b>");
  assert.equal(markdownToTelegramHtml("- пункт"), "• пункт");
  assert.equal(markdownToTelegramHtml("[сайт](https://a.b/c)"), '<a href="https://a.b/c">сайт</a>');
});

test("markdownToTelegramHtml: escapes HTML and leaves code untouched", () => {
  assert.equal(markdownToTelegramHtml("a < b & c"), "a &lt; b &amp; c");
  assert.equal(markdownToTelegramHtml("`**x** <y>`"), "<code>**x** &lt;y&gt;</code>");
  assert.equal(markdownToTelegramHtml("```py\nprint(1 < 2)\n```"), "<pre>print(1 &lt; 2)</pre>");
});

test("markdownToTelegramHtml: keeps underscores inside words and unmatched markers", () => {
  assert.equal(markdownToTelegramHtml("file_name_v2.txt"), "file_name_v2.txt");
  assert.equal(markdownToTelegramHtml("2 * 3 = 6"), "2 * 3 = 6");
});

test("RateLimiter: enforces per-minute and per-day limits independently per user", () => {
  const limiter = new RateLimiter({ perMinute: 2, perDay: 3 });
  const t = 1_000_000_000;
  assert.equal(limiter.check("a", t), null);
  assert.equal(limiter.check("a", t), null);
  assert.equal(limiter.check("a", t), "minute");
  assert.equal(limiter.check("b", t), null);
  assert.equal(limiter.check("a", t + 61_000), null);
  assert.equal(limiter.check("a", t + 122_000), "day");
  assert.equal(limiter.check("a", t + 86_500_000), null);
});

test("JobQueue: keeps one user's jobs in order and caps concurrency", async () => {
  const queue = new JobQueue(2);
  const log: string[] = [];
  let running = 0;
  let peak = 0;
  const job = (name: string) => async () => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 5));
    log.push(name);
    running--;
  };

  queue.add("a", job("a1"));
  queue.add("a", job("a2"));
  queue.add("b", job("b1"));
  queue.add("c", job("c1"));
  assert.equal(queue.pending("a"), 2);

  await new Promise((r) => setTimeout(r, 60));
  assert.equal(peak, 2);
  assert.ok(log.indexOf("a1") < log.indexOf("a2"));
  assert.equal(log.length, 4);
  assert.equal(queue.pending("a"), 0);
});

test("JobQueue: a failed job does not stop the queue", async () => {
  const queue = new JobQueue(1);
  let ran = false;
  queue.add("a", async () => { throw new Error("boom"); });
  queue.add("a", async () => { ran = true; });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(ran, true);
});
