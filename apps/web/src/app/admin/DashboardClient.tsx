"use client";

import React, { useState, useTransition } from "react";
import {
  Users,
  Zap,
  FileText,
  CheckSquare,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Layers,
  MessageSquare,
  Brain,
  ShieldCheck,
  Search,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DashboardMetrics, AudienceStat, ActivityItem } from "./actions";
import { getMetrics, getAudienceStats, getRecentActivity } from "./actions";

interface DashboardClientProps {
  initialMetrics: DashboardMetrics;
  initialAudience: AudienceStat[];
  initialActivity: ActivityItem[];
  botUsername?: string;
}

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#6366f1", // Indigo
];

const PRESETS = [
  "founder",
  "freelance",
  "habr",
  "vc_pitch",
  "telegram_ads",
  "product_hunt",
];

export function DashboardClient({
  initialMetrics,
  initialAudience,
  initialActivity,
  botUsername = "mindopus_bot",
}: DashboardClientProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [audienceStats, setAudienceStats] = useState<AudienceStat[]>(initialAudience);
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivity);
  const [audienceTag, setAudienceTag] = useState<string>("freelance");
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  // Clean tag for telegram start query
  const cleanTag = audienceTag.trim().replace(/[^a-zA-Z0-9_-]/g, "");
  const referralLink = `https://t.me/${botUsername}?start=${cleanTag || "referral"}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const [m, a, act] = await Promise.all([
          getMetrics(),
          getAudienceStats(),
          getRecentActivity(),
        ]);
        setMetrics(m);
        setAudienceStats(a);
        setActivities(act);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err) {
        console.error("Failed to refresh dashboard:", err);
      }
    });
  };

  // Filter activities
  const filteredActivities = activities.filter((act) => {
    const matchesSearch =
      act.telegramId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.actionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.model.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterCategory === "all") return true;
    return act.actionCategory === filterCategory;
  });

  // Prepare chart data
  const chartData = audienceStats.map((item) => ({
    name: item.source,
    value: item.count,
    percentage: item.percentage,
  }));

  // Helper for category badge
  const getCategoryBadge = (category: ActivityItem["actionCategory"]) => {
    switch (category) {
      case "artifact":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
            <FileText className="w-3 h-3" />
            Файл / Артефакт
          </span>
        );
      case "skill":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/20">
            <Sparkles className="w-3 h-3" />
            AI Навык
          </span>
        );
      case "analyzer":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
            <Brain className="w-3 h-3" />
            Анализ намерений
          </span>
        );
      case "reasoning":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            <Zap className="w-3 h-3" />
            Оркестрация
          </span>
        );
      case "chat":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-400 border border-sky-500/20">
            <MessageSquare className="w-3 h-3" />
            Диалог
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-500/10 px-2 py-0.5 text-xs font-medium text-zinc-400 border border-zinc-500/20">
            <Layers className="w-3 h-3" />
            Система
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(36,129,204,0.15),rgba(255,255,255,0))]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                MIND <span className="text-blue-400">Admin</span>
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live System
              </span>
            </div>
            <p className="text-sm text-zinc-400">
              Аналитика в реальном времени, трекинг аудиторий и генерация ссылок
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-zinc-500">Последнее обновление</div>
              <div className="text-xs font-mono text-zinc-300">{lastUpdated}</div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 transition-all hover:border-zinc-600 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin text-blue-400" : ""}`} />
              <span>{isPending ? "Обновление..." : "Обновить"}</span>
            </button>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-300 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Admin Verified</span>
            </div>
          </div>
        </header>

        {/* 1. TOP METRICS BLOCK */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Ключевые показатели
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Users */}
            <div className="relative group overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-5 hover:border-blue-500/50 transition-all shadow-xl shadow-black/40">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users className="w-16 h-16 text-blue-400" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-zinc-400 font-medium">Пользователи</div>
                  <div className="text-2xl font-bold text-white tracking-tight">
                    {metrics.totalUsers.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Telegram OS
                </span>
                <span className="text-zinc-500">Уникальные ID</span>
              </div>
            </div>

            {/* Metric 2: AI Actions */}
            <div className="relative group overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-5 hover:border-purple-500/50 transition-all shadow-xl shadow-black/40">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-16 h-16 text-purple-400" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-zinc-400 font-medium">Действия AI</div>
                  <div className="text-2xl font-bold text-white tracking-tight">
                    {metrics.totalActions.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1 text-purple-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  Agent Runs
                </span>
                <span className="text-zinc-500">Рассуждения & Навыки</span>
              </div>
            </div>

            {/* Metric 3: Artifacts / Files */}
            <div className="relative group overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-5 hover:border-amber-500/50 transition-all shadow-xl shadow-black/40">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileText className="w-16 h-16 text-amber-400" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-zinc-400 font-medium">Сгенерировано файлов</div>
                  <div className="text-2xl font-bold text-white tracking-tight">
                    {metrics.totalArtifacts.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-400">
                <span className="text-amber-400 font-mono">DOCX, PPTX, XLSX</span>
                <span className="text-zinc-500">Артефакты</span>
              </div>
            </div>

            {/* Metric 4: Tasks */}
            <div className="relative group overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-5 hover:border-emerald-500/50 transition-all shadow-xl shadow-black/40">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CheckSquare className="w-16 h-16 text-emerald-400" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-zinc-400 font-medium">Всего задач</div>
                  <div className="text-2xl font-bold text-white tracking-tight">
                    {metrics.totalTasks.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-400">
                <span className="text-emerald-400">Proactive Engine</span>
                <span className="text-zinc-500">Цели & Дедлайны</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. REFERRAL & LINK GENERATOR + AUDIENCE CHART */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Referral Link Generator (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-6 shadow-xl shadow-black/40 flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Генератор реферальных ссылок</h2>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Campaign Tracker
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Введите идентификатор рекламного канала или аудитории (например,{" "}
                <code className="px-1 py-0.5 rounded bg-zinc-800 text-blue-300">freelance</code> или{" "}
                <code className="px-1 py-0.5 rounded bg-zinc-800 text-blue-300">founder</code>). При переходе
                бота пользователь автоматически маркируется этим значением в поле <code className="text-zinc-300">source</code>.
              </p>
            </div>

            {/* Input & Button */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-300">
                Название источника / когорты (Slug):
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 text-xs font-mono">
                    ?start=
                  </div>
                  <input
                    type="text"
                    value={audienceTag}
                    onChange={(e) => setAudienceTag(e.target.value)}
                    placeholder="например, freelance или vc_pitch"
                    className="w-full pl-16 pr-4 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-lg ${
                    copied
                      ? "bg-emerald-600 text-white shadow-emerald-500/20"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
              </div>

              {/* Ready link box */}
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-2 overflow-hidden">
                <div className="text-xs font-mono text-zinc-400 truncate">
                  <span className="text-zinc-500">Готовая ссылка: </span>
                  <span className="text-blue-400 select-all font-medium">{referralLink}</span>
                </div>
                <a
                  href={referralLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md transition-colors"
                  title="Открыть ссылку в Telegram"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Quick preset chips */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/60">
              <div className="text-xs text-zinc-400 font-medium">Быстрые пресеты кампаний:</div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAudienceTag(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                      audienceTag === preset
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                        : "bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60"
                    }`}
                  >
                    #{preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Pie Chart Distribution (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-6 shadow-xl shadow-black/40 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-white">Источники аудитории</h2>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                {audienceStats.length} {audienceStats.length === 1 ? "когорта" : "когорт"}
              </span>
            </div>

            {/* Chart Area */}
            <div className="w-full h-56 flex items-center justify-center">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length] ?? "#3b82f6"}
                          stroke="#18181b"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        const item = payload?.[0];
                        if (active && item?.payload) {
                          const data = item.payload as (typeof chartData)[0];
                          const colorIndex = chartData.findIndex((c) => c.name === data.name);
                          const fillColor =
                            COLORS[(colorIndex >= 0 ? colorIndex : 0) % COLORS.length] ?? "#3b82f6";
                          return (
                            <div className="bg-zinc-900/95 border border-zinc-700/80 p-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1">
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor: fillColor,
                                  }}
                                />
                                <span>{data.name}</span>
                              </div>
                              <div className="text-zinc-300">
                                Пользователей: <span className="font-bold text-white">{data.value}</span>
                              </div>
                              <div className="text-zinc-400">
                                Доля: <span className="text-blue-400 font-medium">{data.percentage}%</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => (
                        <span className="text-xs text-zinc-300 font-mono">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-zinc-500">Нет данных для отображения</div>
              )}
            </div>

            {/* Stats Breakdown list */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-800/60 max-h-28 overflow-y-auto pr-1">
              {audienceStats.map((item, idx) => (
                <div
                  key={item.source}
                  className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-zinc-950/40 hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] ?? "#3b82f6" }}
                    />
                    <span className="font-mono text-zinc-300">{item.source}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-zinc-400">{item.count} чел.</span>
                    <span className="text-zinc-500 font-medium w-8 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. LIVE ACTIVITY FEED */}
        <section className="rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-6 shadow-xl shadow-black/40 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-white">Live Activity Feed</h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-mono">
                  {filteredActivities.length} событий
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Последние 20 действий пользователей, запусков навыков и генераций документов
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Поиск по ID, действию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 text-xs">
                <button
                  onClick={() => setFilterCategory("all")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    filterCategory === "all" ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Все
                </button>
                <button
                  onClick={() => setFilterCategory("artifact")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    filterCategory === "artifact" ? "bg-amber-500/20 text-amber-300 font-medium" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Файлы
                </button>
                <button
                  onClick={() => setFilterCategory("skill")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    filterCategory === "skill" ? "bg-purple-500/20 text-purple-300 font-medium" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Навыки
                </button>
                <button
                  onClick={() => setFilterCategory("reasoning")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    filterCategory === "reasoning" ? "bg-emerald-500/20 text-emerald-300 font-medium" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  AI Запуски
                </button>
              </div>
            </div>
          </div>

          {/* Activity Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800/80 font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Время</th>
                  <th className="py-3 px-4">Пользователь (TG ID)</th>
                  <th className="py-3 px-4">Источник</th>
                  <th className="py-3 px-4">Действие / Навык</th>
                  <th className="py-3 px-4">Модель</th>
                  <th className="py-3 px-4 text-right">Токены</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((act) => {
                    const dateObj = new Date(act.createdAt);
                    const formattedTime = dateObj.toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });
                    const formattedDate = dateObj.toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                    });

                    return (
                      <tr
                        key={act.id}
                        className="hover:bg-zinc-900/60 transition-colors group"
                      >
                        {/* Time */}
                        <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                          <span className="text-zinc-200 font-semibold">{formattedTime}</span>
                          <span className="text-zinc-500 ml-1.5 text-[11px] font-sans">
                            {formattedDate}
                          </span>
                        </td>

                        {/* User / TG ID */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold font-sans">
                              {act.telegramId ? act.telegramId.slice(0, 2) : "U"}
                            </div>
                            <span className="text-zinc-200 font-medium">
                              {act.telegramId}
                            </span>
                          </div>
                        </td>

                        {/* Source Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium font-sans border ${
                              act.source === "organic"
                                ? "bg-zinc-800 text-zinc-300 border-zinc-700"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            }`}
                          >
                            {act.source}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 font-sans">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getCategoryBadge(act.actionCategory)}
                              <span className="text-zinc-200 font-medium text-xs">
                                {act.actionTitle}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500">
                              raw: {act.action}
                            </div>
                          </div>
                        </td>

                        {/* Model */}
                        <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
                            {act.model || "default"}
                          </span>
                        </td>

                        {/* Tokens */}
                        <td className="py-3 px-4 text-right text-zinc-300 whitespace-nowrap">
                          {act.totalTokens > 0 ? (
                            <span className="text-zinc-200 font-semibold">
                              {act.totalTokens.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 font-sans">
                      Активности по заданным фильтрам не найдено.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-zinc-900 text-center text-xs text-zinc-600 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>MIND Personal AI Operating System — Internal Founder Control Center</div>
          <div className="font-mono text-zinc-500">v0.1.0 • Node.js + Next.js + PostgreSQL</div>
        </footer>
      </div>
    </div>
  );
}
