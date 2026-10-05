"use server";

import { db, schema } from "@mind/db";
import { desc, eq, sql, or, ilike } from "drizzle-orm";

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
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.agentRuns)
        .where(
          or(
            ilike(schema.agentRuns.action, "skill_%"),
            ilike(schema.agentRuns.action, "%artifact%"),
            ilike(schema.agentRuns.action, "%document%"),
            ilike(schema.agentRuns.action, "%presentation%"),
            ilike(schema.agentRuns.action, "%spreadsheet%")
          )
        ),
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
