"use server";

import { db, schema } from "@mind/db";
import { desc, eq, sql, gte } from "drizzle-orm";

export interface ModelUsageStat {
  model: string;
  provider: "gemini" | "groq" | "openrouter" | "cerebras" | "other";
  displayName: string;
  tier: "simple" | "standard" | "complex" | "embedding";
  tokensToday: number;
  tokensTotal: number;
  promptTokensTotal: number;
  outputTokensTotal: number;
  requestsToday: number;
  requestsTotal: number;
  dailyTokenLimit: number | null;
  dailyRequestLimit: number;
  rpmLimit: number;
  tokenUsagePercent: number;
  requestUsagePercent: number;
  remainingTokensToday: number | null;
  remainingRequestsToday: number;
  lastUsed: string | null;
  status: "healthy" | "warning" | "exhausted";
}

export interface ProviderQuota {
  id: string;
  name: string;
  configured: boolean;
  dailyRequestLimit: number;
  dailyRequestsUsed: number;
  dailyRequestsRemaining: number;
  resetSchedule: string;
  badge: string;
}

export interface AiDashboardData {
  totalTokensAllTime: number;
  totalPromptTokensAllTime: number;
  totalOutputTokensAllTime: number;
  totalTokensToday: number;
  totalRequestsToday: number;
  totalRequestsAllTime: number;
  nextResetUtc: string;
  providers: ProviderQuota[];
  models: ModelUsageStat[];
  dbConnected: boolean;
  errorMessage?: string;
}

export interface DashboardMetrics {
  totalUsers: number;
  totalTasks: number;
  totalArtifacts: number;
  totalActions: number;
  dbConnected?: boolean;
  errorMessage?: string;
}

export interface AudienceStat {
  source: string;
  count: number;
  percentage: number;
}

export interface ActivityItem {
  id: string;
  createdAt: string;
  userId: string;
  telegramId: string;
  source: string;
  action: string;
  actionTitle: string;
  actionCategory: "artifact" | "skill" | "analyzer" | "chat" | "reasoning" | "other";
  model: string;
  totalTokens: number;
}

/**
 * Format system action into human-friendly badge & category
 */
function formatAction(rawAction: string): { title: string; category: ActivityItem["actionCategory"] } {
  const action = rawAction.toLowerCase();

  if (action.includes("presentation") || action === "skill_presentation-generation") {
    return { title: "Генерация презентации (PPTX)", category: "artifact" };
  }
  if (action.includes("document") || action === "skill_document-generation") {
    return { title: "Генерация документа (DOCX)", category: "artifact" };
  }
  if (action.includes("spreadsheet") || action === "skill_spreadsheet-generation") {
    return { title: "Генерация таблицы (XLSX)", category: "artifact" };
  }
  if (action.startsWith("skill_")) {
    const skillName = rawAction.replace(/^skill_/, "");
    return { title: `Вызов навыка: ${skillName}`, category: "skill" };
  }
  if (action === "unified_analyzer" || action.includes("analyzer")) {
    return { title: "Анализ намерения (Analyzer)", category: "analyzer" };
  }
  if (action === "execution_loop" || action === "execution_plan") {
    return { title: "Оркестрация / Выполнение", category: "reasoning" };
  }
  if (action.includes("chat")) {
    return { title: "Диалог с пользователем", category: "chat" };
  }
  if (action.includes("embedding")) {
    return { title: "Векторный поиск памяти", category: "other" };
  }

  return { title: rawAction, category: "other" };
}

/**
 * Fetches high-level metrics: Users, Tasks, Generated Artifacts, Total AI Runs
 */
export async function getMetrics(): Promise<DashboardMetrics> {
  if (!process.env.DATABASE_URL) {
    console.error("[getMetrics] DATABASE_URL is not set");
    return {
      totalUsers: 0,
      totalTasks: 0,
      totalActions: 0,
      totalArtifacts: 0,
      dbConnected: false,
      errorMessage: "Переменная окружения DATABASE_URL не обнаружена. Добавьте её в настройках сервиса Web на Render.",
    };
  }

  try {
    const [usersResult, tasksResult, actionsResult, artifactsResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(schema.users),
      db.select({ count: sql<number>`count(*)::int` }).from(schema.tasks),
      db.select({ count: sql<number>`count(*)::int` }).from(schema.agentRuns),
      db.select({ count: sql<number>`count(*)::int` }).from(schema.artifacts),
    ]);

    return {
      totalUsers: usersResult[0]?.count ?? 0,
      totalTasks: tasksResult[0]?.count ?? 0,
      totalActions: actionsResult[0]?.count ?? 0,
      totalArtifacts: artifactsResult[0]?.count ?? 0,
      dbConnected: true,
    };
  } catch (error: any) {
    console.error("[getMetrics] Error fetching dashboard metrics:", error);
    return {
      totalUsers: 0,
      totalTasks: 0,
      totalActions: 0,
      totalArtifacts: 0,
      dbConnected: false,
      errorMessage: error?.message || "Ошибка соединения с Postgres базой данных",
    };
  }
}

/**
 * Groups users by acquisition source (e.g. founder, freelance, organic)
 */
export async function getAudienceStats(): Promise<AudienceStat[]> {
  try {
    const rows = await db
      .select({
        source: sql<string>`coalesce(nullif(trim(${schema.users.source}), ''), 'organic')`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.users)
      .groupBy(sql`coalesce(nullif(trim(${schema.users.source}), ''), 'organic')`)
      .orderBy(desc(sql`count(*)`));

    const total = rows.reduce((sum, r) => sum + (r.count || 0), 0);

    return rows.map((r) => ({
      source: r.source || "organic",
      count: r.count,
      percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
    }));
  } catch (error) {
    console.error("[getAudienceStats] Error fetching audience stats:", error);
    return [];
  }
}

/**
 * Fetches last 20 actions from agent_runs joined with users table
 */
export async function getRecentActivity(): Promise<ActivityItem[]> {
  try {
    const runs = await db
      .select({
        id: schema.agentRuns.id,
        createdAt: schema.agentRuns.createdAt,
        action: schema.agentRuns.action,
        model: schema.agentRuns.model,
        totalTokens: schema.agentRuns.totalTokens,
        userId: schema.users.id,
        telegramId: schema.users.telegramId,
        source: schema.users.source,
      })
      .from(schema.agentRuns)
      .leftJoin(schema.users, eq(schema.agentRuns.userId, schema.users.id))
      .orderBy(desc(schema.agentRuns.createdAt))
      .limit(20);

    return runs.map((row) => {
      const { title, category } = formatAction(row.action);
      return {
        id: row.id,
        createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
        userId: row.userId ?? "unknown",
        telegramId: row.telegramId ? String(row.telegramId) : "unknown",
        source: row.source || "organic",
        action: row.action,
        actionTitle: title,
        actionCategory: category,
        model: row.model,
        totalTokens: row.totalTokens || 0,
      };
    });
  } catch (error) {
    console.error("[getRecentActivity] Error fetching recent activity:", error);
    return [];
  }
}

const KNOWN_MODEL_METADATA: Record<
  string,
  {
    displayName: string;
    provider: "gemini" | "groq" | "openrouter" | "cerebras" | "other";
    tier: "simple" | "standard" | "complex" | "embedding";
    dailyTokenLimit: number | null;
    dailyRequestLimit: number;
    rpmLimit: number;
  }
> = {
  "gemini-3.5-flash": {
    displayName: "Gemini 3.5 Flash",
    provider: "gemini",
    tier: "standard",
    dailyTokenLimit: null,
    dailyRequestLimit: 1500,
    rpmLimit: 15,
  },
  "gemini-3.5-flash-lite": {
    displayName: "Gemini 3.5 Flash Lite",
    provider: "gemini",
    tier: "simple",
    dailyTokenLimit: null,
    dailyRequestLimit: 1500,
    rpmLimit: 30,
  },
  "gemini-3.8-flash": {
    displayName: "Gemini 3.8 Flash (Preview)",
    provider: "gemini",
    tier: "standard",
    dailyTokenLimit: null,
    dailyRequestLimit: 1500,
    rpmLimit: 15,
  },
  "gemini-embedding-2": {
    displayName: "Gemini Embedding 2",
    provider: "gemini",
    tier: "embedding",
    dailyTokenLimit: null,
    dailyRequestLimit: 1500,
    rpmLimit: 1500,
  },
  "openai/gpt-oss-120b": {
    displayName: "Llama 3.3 70B (Groq OSS 120B)",
    provider: "groq",
    tier: "complex",
    dailyTokenLimit: 100000,
    dailyRequestLimit: 1000,
    rpmLimit: 30,
  },
  "openai/gpt-oss-20b": {
    displayName: "Llama 3.1 8B (Groq OSS 20B)",
    provider: "groq",
    tier: "simple",
    dailyTokenLimit: 500000,
    dailyRequestLimit: 14400,
    rpmLimit: 30,
  },
  "llama-3.3-70b-versatile": {
    displayName: "Llama 3.3 70B Versatile (Groq)",
    provider: "groq",
    tier: "complex",
    dailyTokenLimit: 100000,
    dailyRequestLimit: 1000,
    rpmLimit: 30,
  },
  "llama-3.1-8b-instant": {
    displayName: "Llama 3.1 8B Instant (Groq)",
    provider: "groq",
    tier: "simple",
    dailyTokenLimit: 500000,
    dailyRequestLimit: 14400,
    rpmLimit: 30,
  },
  "qwen/qwen3.8-27b:free": {
    displayName: "Qwen 2.5 72B (OpenRouter Free)",
    provider: "openrouter",
    tier: "standard",
    dailyTokenLimit: null,
    dailyRequestLimit: 50,
    rpmLimit: 20,
  },
  "llama3.1-8b": {
    displayName: "Llama 3.1 8B (Cerebras)",
    provider: "cerebras",
    tier: "simple",
    dailyTokenLimit: 1000000,
    dailyRequestLimit: 14400,
    rpmLimit: 30,
  },
};

function getModelMetadata(modelName: string) {
  if (KNOWN_MODEL_METADATA[modelName]) {
    return KNOWN_MODEL_METADATA[modelName];
  }
  const lower = modelName.toLowerCase();
  let provider: "gemini" | "groq" | "openrouter" | "cerebras" | "other" = "other";
  if (lower.includes("gemini")) provider = "gemini";
  else if (lower.includes("groq") || lower.includes("gpt-oss")) provider = "groq";
  else if (lower.includes("qwen") || lower.includes("openrouter") || lower.includes(":free")) provider = "openrouter";
  else if (lower.includes("cerebras")) provider = "cerebras";

  return {
    displayName: modelName,
    provider,
    tier: (lower.includes("lite") || lower.includes("8b")
      ? "simple"
      : lower.includes("embed")
      ? "embedding"
      : "standard") as "simple" | "standard" | "complex" | "embedding",
    dailyTokenLimit: null,
    dailyRequestLimit: provider === "gemini" ? 1500 : provider === "openrouter" ? 50 : 1000,
    rpmLimit: 30,
  };
}

/**
 * Fetches comprehensive AI metrics, live quotas, and countdown to midnight UTC reset
 */
export async function getAiMetrics(): Promise<AiDashboardData> {
  const now = new Date();
  const nextMidnightUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  );
  const nextResetUtc = nextMidnightUtc.toISOString();

  const todayStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );

  const defaultResult: AiDashboardData = {
    totalTokensAllTime: 0,
    totalPromptTokensAllTime: 0,
    totalOutputTokensAllTime: 0,
    totalTokensToday: 0,
    totalRequestsToday: 0,
    totalRequestsAllTime: 0,
    nextResetUtc,
    providers: [],
    models: [],
    dbConnected: false,
    errorMessage: "База данных не подключена",
  };

  if (!process.env.DATABASE_URL) {
    return defaultResult;
  }

  try {
    // 1. Fetch live OpenRouter status if key exists
    let openRouterLive: { used: number; limit: number; remaining: number } | null = null;
    if (process.env.OPEN_ROUTER_API) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
          headers: { Authorization: `Bearer ${process.env.OPEN_ROUTER_API}` },
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          const daily = json?.data?.free_model_daily_requests;
          if (daily) {
            openRouterLive = {
              used: Number(daily.used ?? 0),
              limit: Number(daily.limit ?? 50),
              remaining: Number(daily.remaining ?? 50),
            };
          }
        }
      } catch (err) {
        console.warn("[getAiMetrics] OpenRouter live check error:", err);
      }
    }

    // 2. Fetch all-time model usage from agent_runs
    const allTimeRows = await db
      .select({
        model: schema.agentRuns.model,
        count: sql<number>`count(*)::int`,
        promptTokens: sql<number>`sum(${schema.agentRuns.promptTokens})::int`,
        outputTokens: sql<number>`sum(${schema.agentRuns.outputTokens})::int`,
        totalTokens: sql<number>`sum(${schema.agentRuns.totalTokens})::int`,
        lastUsed: sql<string>`max(${schema.agentRuns.createdAt})::text`,
      })
      .from(schema.agentRuns)
      .groupBy(schema.agentRuns.model)
      .orderBy(desc(sql`sum(${schema.agentRuns.totalTokens})`));

    // 3. Fetch today's model usage from agent_runs (>= todayStartUtc)
    const todayRows = await db
      .select({
        model: schema.agentRuns.model,
        count: sql<number>`count(*)::int`,
        promptTokens: sql<number>`sum(${schema.agentRuns.promptTokens})::int`,
        outputTokens: sql<number>`sum(${schema.agentRuns.outputTokens})::int`,
        totalTokens: sql<number>`sum(${schema.agentRuns.totalTokens})::int`,
      })
      .from(schema.agentRuns)
      .where(gte(schema.agentRuns.createdAt, todayStartUtc))
      .groupBy(schema.agentRuns.model);

    const todayMap = new Map(todayRows.map((r) => [r.model, r]));

    // Known default models to ensure always listed even if 0 calls today
    const registeredModelKeys = Object.keys(KNOWN_MODEL_METADATA);
    const existingModelKeys = new Set(allTimeRows.map((r) => r.model));
    const allModelNames = Array.from(new Set([...existingModelKeys, ...registeredModelKeys]));

    let totalTokensAllTime = 0;
    let totalPromptTokensAllTime = 0;
    let totalOutputTokensAllTime = 0;
    let totalTokensToday = 0;
    let totalRequestsToday = 0;
    let totalRequestsAllTime = 0;

    const models: ModelUsageStat[] = allModelNames.map((modelName) => {
      const meta = getModelMetadata(modelName);
      const allTime = allTimeRows.find((r) => r.model === modelName);
      const today = todayMap.get(modelName);

      const tokensTotal = allTime?.totalTokens ?? 0;
      const promptTokensTotal = allTime?.promptTokens ?? 0;
      const outputTokensTotal = allTime?.outputTokens ?? 0;
      const requestsTotal = allTime?.count ?? 0;

      const tokensToday = today?.totalTokens ?? 0;
      const requestsToday = today?.count ?? 0;

      totalTokensAllTime += tokensTotal;
      totalPromptTokensAllTime += promptTokensTotal;
      totalOutputTokensAllTime += outputTokensTotal;
      totalTokensToday += tokensToday;
      totalRequestsToday += requestsToday;
      totalRequestsAllTime += requestsTotal;

      const dailyTokenLimit = meta.dailyTokenLimit;
      const dailyRequestLimit = meta.dailyRequestLimit;

      const tokenUsagePercent = dailyTokenLimit
        ? Math.min(100, Math.round((tokensToday / dailyTokenLimit) * 100))
        : 0;

      const requestUsagePercent = dailyRequestLimit
        ? Math.min(100, Math.round((requestsToday / dailyRequestLimit) * 100))
        : 0;

      const remainingTokensToday = dailyTokenLimit
        ? Math.max(0, dailyTokenLimit - tokensToday)
        : null;

      const remainingRequestsToday = Math.max(0, dailyRequestLimit - requestsToday);

      let status: "healthy" | "warning" | "exhausted" = "healthy";
      if (requestUsagePercent >= 95 || (dailyTokenLimit && tokenUsagePercent >= 95)) {
        status = "exhausted";
      } else if (requestUsagePercent >= 75 || (dailyTokenLimit && tokenUsagePercent >= 75)) {
        status = "warning";
      }

      return {
        model: modelName,
        provider: meta.provider,
        displayName: meta.displayName,
        tier: meta.tier,
        tokensToday,
        tokensTotal,
        promptTokensTotal,
        outputTokensTotal,
        requestsToday,
        requestsTotal,
        dailyTokenLimit,
        dailyRequestLimit,
        rpmLimit: meta.rpmLimit,
        tokenUsagePercent,
        requestUsagePercent,
        remainingTokensToday,
        remainingRequestsToday,
        lastUsed: allTime?.lastUsed ?? null,
        status,
      };
    });

    // Sort models: first those with usage, then by total tokens descending
    models.sort((a, b) => b.tokensTotal - a.tokensTotal || b.requestsTotal - a.requestsTotal);

    // Group requests by provider for provider overview cards
    const geminiReqToday = models
      .filter((m) => m.provider === "gemini")
      .reduce((s, m) => s + m.requestsToday, 0);

    const groqReqToday = models
      .filter((m) => m.provider === "groq")
      .reduce((s, m) => s + m.requestsToday, 0);

    const providers: ProviderQuota[] = [
      {
        id: "gemini",
        name: "Google Gemini",
        configured: Boolean(process.env.GEMINI_API_KEY),
        dailyRequestLimit: 1500,
        dailyRequestsUsed: geminiReqToday,
        dailyRequestsRemaining: Math.max(0, 1500 - geminiReqToday),
        resetSchedule: "Ежедневно в 00:00 UTC (03:00 MSK)",
        badge: "Primary Engine",
      },
      {
        id: "groq",
        name: "Groq Cloud",
        configured: Boolean(process.env.GROQ_API_KEY),
        dailyRequestLimit: 1000,
        dailyRequestsUsed: groqReqToday,
        dailyRequestsRemaining: Math.max(0, 1000 - groqReqToday),
        resetSchedule: "Ежедневно в 00:00 UTC (03:00 MSK)",
        badge: "High-Speed Inference",
      },
      {
        id: "openrouter",
        name: "OpenRouter",
        configured: Boolean(process.env.OPEN_ROUTER_API),
        dailyRequestLimit: openRouterLive ? openRouterLive.limit : 50,
        dailyRequestsUsed: openRouterLive ? openRouterLive.used : 0,
        dailyRequestsRemaining: openRouterLive ? openRouterLive.remaining : 50,
        resetSchedule: "Ежедневно в 00:00 UTC (03:00 MSK)",
        badge: "Multi-Model Fallback",
      },
      {
        id: "cerebras",
        name: "Cerebras",
        configured: Boolean(process.env.CEREBRAS_API_KEY),
        dailyRequestLimit: 14400,
        dailyRequestsUsed: 0,
        dailyRequestsRemaining: 14400,
        resetSchedule: "Ежедневно в 00:00 UTC (03:00 MSK)",
        badge: "Cerebras Cloud",
      },
    ];

    return {
      totalTokensAllTime,
      totalPromptTokensAllTime,
      totalOutputTokensAllTime,
      totalTokensToday,
      totalRequestsToday,
      totalRequestsAllTime,
      nextResetUtc,
      providers,
      models,
      dbConnected: true,
    };
  } catch (error: any) {
    console.error("[getAiMetrics] Error fetching AI metrics:", error);
    return {
      ...defaultResult,
      errorMessage: error?.message || "Ошибка загрузки метрик AI",
    };
  }
}

