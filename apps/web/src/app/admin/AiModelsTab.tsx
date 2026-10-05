"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Clock,
  Flame,
  Activity,
  CheckCircle2,
  Key,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AiDashboardData, ModelUsageStat } from "./actions";

interface AiModelsTabProps {
  data: AiDashboardData;
  isPending: boolean;
  onRefresh: () => void;
}

export function AiModelsTab({ data, isPending, onRefresh }: AiModelsTabProps) {
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentTimeUtc, setCurrentTimeUtc] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });

  // Update live countdown to midnight UTC every second
  useEffect(() => {
    function tick() {
      const now = new Date();
      setCurrentTimeUtc(
        now.toUTCString().split(" ").slice(4, 5).join("") + " UTC"
      );

      if (!data.nextResetUtc) return;
      const target = new Date(data.nextResetUtc).getTime();
      const diff = Math.max(0, target - now.getTime());

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data.nextResetUtc]);

  // Filter models
  const filteredModels = data.models.filter((m) => {
    const matchesProvider =
      providerFilter === "all" || m.provider === providerFilter;
    const matchesSearch =
      m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tier.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProvider && matchesSearch;
  });

  // Chart data: models with usage > 0, or top 6 models
  const chartData = data.models
    .filter((m) => m.tokensTotal > 0 || m.requestsTotal > 0)
    .slice(0, 6)
    .map((m) => ({
      name: m.displayName
        .replace(" (Preview)", "")
        .replace(" (Groq OSS 120B)", "")
        .replace(" (Groq OSS 20B)", "")
        .replace(" (OpenRouter Free)", ""),
      "Промпт токены": m.promptTokensTotal,
      "Аутпут токены": m.outputTokensTotal,
      "Всего токенов": m.tokensTotal,
    }));

  const getTierBadge = (tier: ModelUsageStat["tier"]) => {
    switch (tier) {
      case "simple":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Simple (Быстрые)
          </span>
        );
      case "standard":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Standard (Основной)
          </span>
        );
      case "complex":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Complex (Рассуждения)
          </span>
        );
      case "embedding":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Embedding (Память)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            {tier}
          </span>
        );
    }
  };

  const getProviderBadge = (provider: ModelUsageStat["provider"]) => {
    switch (provider) {
      case "gemini":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            Google Gemini
          </span>
        );
      case "groq":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30">
            Groq Cloud
          </span>
        );
      case "openrouter":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            OpenRouter
          </span>
        );
      case "cerebras":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Cerebras
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-700/40 text-zinc-300 border border-zinc-600/30">
            {provider}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* 1. LIVE QUOTA RESET HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-800/50 p-6 sm:p-8 shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>Суточный цикл квот</span>
              <span className="text-blue-200/60">•</span>
              <span className="font-mono text-zinc-300">{currentTimeUtc || "UTC"}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Обновление суточных лимитов и токенов
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Все суточные квоты моделей (Google Gemini, Groq, OpenRouter) автоматически сбрасываются каждые 24 часа ровно в <b>00:00 UTC</b> (03:00 по московскому времени).
            </p>
          </div>

          {/* Countdown Clock Display & Refresh */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-3 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-inner shadow-black/80">
              <div className="text-center min-w-[64px]">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                  {String(timeLeft.hours).padStart(2, "0")}
                </div>
                <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider mt-0.5">
                  Часов
                </div>
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-blue-400 font-mono -mt-3">:</span>
              <div className="text-center min-w-[64px]">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </div>
                <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider mt-0.5">
                  Минут
                </div>
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-blue-400 font-mono -mt-3">:</span>
              <div className="text-center min-w-[64px]">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-400 tracking-tight">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </div>
                <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider mt-0.5">
                  Секунд
                </div>
              </div>
            </div>

            <button
              onClick={onRefresh}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 transition-all hover:border-zinc-500 active:scale-95 disabled:opacity-50 h-full shadow-lg"
              title="Обновить данные по ИИ"
            >
              <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin text-blue-400" : ""}`} />
              <span className="hidden sm:inline">{isPending ? "Синхронизация..." : "Сверить квоты"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TOP AI KPI CARDS */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Сводка по токенам и запросам
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: All-Time Tokens */}
          <div className="relative group overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-5 hover:border-blue-500/50 transition-all shadow-xl shadow-black/40">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Cpu className="w-16 h-16 text-blue-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-zinc-400 font-medium">Токенов за всё время</div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {data.totalTokensAllTime.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-400 font-mono">
              <span>Prompt: {data.totalPromptTokensAllTime.toLocaleString()}</span>
              <span>Output: {data.totalOutputTokensAllTime.toLocaleString()}</span>
            </div>
          </div>

          {/* Card 2: Tokens Today */}
          <div className="relative group overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-5 hover:border-orange-500/50 transition-all shadow-xl shadow-black/40">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Flame className="w-16 h-16 text-orange-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-zinc-400 font-medium">Токенов сегодня (UTC)</div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {data.totalTokensToday.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-400">
              <span className="text-orange-400 font-medium">Сброс в 00:00 UTC</span>
              <span>Суточный расход</span>
            </div>
          </div>

          {/* Card 3: Requests Today */}
          <div className="relative group overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-5 hover:border-emerald-500/50 transition-all shadow-xl shadow-black/40">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="w-16 h-16 text-emerald-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-zinc-400 font-medium">Запросов к ИИ сегодня</div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {data.totalRequestsToday.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-400">
              <span>Всего запусков:</span>
              <span className="font-semibold text-zinc-300">
                {data.totalRequestsAllTime.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Card 4: Providers Active */}
          <div className="relative group overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-5 hover:border-purple-500/50 transition-all shadow-xl shadow-black/40">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle2 className="w-16 h-16 text-purple-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-zinc-400 font-medium">Активных провайдеров</div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {data.providers.filter((p) => p.configured).length} / {data.providers.length}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-400">
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Gemini, Groq, OpenRouter
              </span>
              <span>Мультимодели</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROVIDER QUOTAS CARDS */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Квоты и статусы провайдеров
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.providers.map((p) => {
            const percent = Math.min(
              100,
              Math.round((p.dailyRequestsUsed / p.dailyRequestLimit) * 100)
            );
            return (
              <div
                key={p.id}
                className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-5 space-y-4 hover:border-zinc-700 transition-all shadow-lg shadow-black/30"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold text-white text-base flex items-center gap-2">
                      {p.name}
                      {p.configured ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" title="API ключ настроен" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-zinc-600" title="API ключ не указан" />
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400">{p.badge}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      p.configured
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    {p.configured ? "Активен" : "Не настроен"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Суточный лимит</span>
                    <span className="font-mono text-zinc-200">
                      {p.dailyRequestsUsed} / {p.dailyRequestLimit.toLocaleString()} запр.
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percent > 85
                          ? "bg-red-500"
                          : percent > 60
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.max(percent, p.dailyRequestsUsed > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
                    <span>Осталось: {p.dailyRequestsRemaining.toLocaleString()}</span>
                    <span>{percent}%</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400 flex items-center justify-between">
                  <span className="text-zinc-500">Сброс:</span>
                  <span className="font-mono text-zinc-300">00:00 UTC (03:00 MSK)</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. TOKEN DISTRIBUTION CHART */}
      {chartData.length > 0 && (
        <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 space-y-4 shadow-xl shadow-black/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">
                Распределение токенов по моделям
              </h3>
              <p className="text-xs text-zinc-400">
                Соотношение входящих (Prompt) и исходящих (Output) токенов по моделям за всё время
              </p>
            </div>
            <div className="text-xs font-mono text-zinc-500">
              Всего учтено: {data.totalTokensAllTime.toLocaleString()} токенов
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "12px",
                    color: "#f43f5e",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.8)",
                  }}
                  itemStyle={{ color: "#f4f4f5" }}
                  formatter={(val: any) => [`${Number(val || 0).toLocaleString()} токенов`, ""]}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "16px", fontSize: "12px", color: "#a1a1aa" }}
                />
                <Bar dataKey="Промпт токены" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Аутпут токены" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* 5. DETAILED MODEL QUOTAS & USAGE TABLE */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              Квоты и использование моделей
            </h3>
            <p className="text-xs text-zinc-400">
              Лимиты вызовов в минуту (RPM), суточные квоты (RPD) и статус расхода токенов
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск модели..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all w-44"
              />
            </div>

            {/* Provider Filter */}
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs">
              <button
                onClick={() => setProviderFilter("all")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  providerFilter === "all"
                    ? "bg-blue-600 text-white font-medium shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setProviderFilter("gemini")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  providerFilter === "gemini"
                    ? "bg-blue-600 text-white font-medium shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Gemini
              </button>
              <button
                onClick={() => setProviderFilter("groq")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  providerFilter === "groq"
                    ? "bg-blue-600 text-white font-medium shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Groq
              </button>
              <button
                onClick={() => setProviderFilter("openrouter")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  providerFilter === "openrouter"
                    ? "bg-blue-600 text-white font-medium shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                OpenRouter
              </button>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-xl shadow-black/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400 font-medium">
                <th className="py-3 px-4">Модель и Провайдер</th>
                <th className="py-3 px-4">Назначение</th>
                <th className="py-3 px-4 text-right">Токены сегодня</th>
                <th className="py-3 px-4 text-right">Токены всего</th>
                <th className="py-3 px-4 text-center">Запросы сегодня</th>
                <th className="py-3 px-4">Суточный лимит</th>
                <th className="py-3 px-4 text-right">Запас (до 00:00 UTC)</th>
                <th className="py-3 px-4 text-center">RPM</th>
                <th className="py-3 px-4 text-center">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredModels.length > 0 ? (
                filteredModels.map((m) => {
                  const reqPercent = Math.min(
                    100,
                    Math.round((m.requestsToday / m.dailyRequestLimit) * 100)
                  );
                  return (
                    <tr
                      key={m.model}
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Model & Provider */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-white text-sm">
                            {m.displayName}
                          </div>
                          <div className="flex items-center gap-2">
                            {getProviderBadge(m.provider)}
                            <span className="font-mono text-[11px] text-zinc-500">
                              {m.model}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getTierBadge(m.tier)}
                      </td>

                      {/* Tokens Today */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {m.tokensToday > 0 ? (
                          <span className="font-semibold text-orange-400 font-mono">
                            {m.tokensToday.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-zinc-600 font-mono">0</span>
                        )}
                      </td>

                      {/* Tokens Total */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-semibold text-zinc-200 font-mono">
                          {m.tokensTotal > 0 ? m.tokensTotal.toLocaleString() : "0"}
                        </div>
                        {m.tokensTotal > 0 && (
                          <div className="text-[10px] text-zinc-500 font-mono">
                            in: {m.promptTokensTotal.toLocaleString()} • out: {m.outputTokensTotal.toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Requests Today */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono text-zinc-300">
                        <span className="font-semibold">{m.requestsToday}</span>
                        <span className="text-zinc-600"> / {m.dailyRequestLimit}</span>
                      </td>

                      {/* Quota Progress Bar */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="space-y-1.5">
                          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                reqPercent > 85
                                  ? "bg-red-500"
                                  : reqPercent > 50
                                  ? "bg-amber-500"
                                  : "bg-blue-500"
                              }`}
                              style={{ width: `${Math.max(reqPercent, m.requestsToday > 0 ? 5 : 0)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                            <span>{reqPercent}% запр.</span>
                            <span>{m.dailyTokenLimit ? `${m.dailyTokenLimit.toLocaleString()} т/д` : "1M TPM"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Remaining */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-zinc-300">
                        <span className="text-emerald-400 font-medium">
                          {m.remainingRequestsToday.toLocaleString()} запр.
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          {m.remainingTokensToday !== null
                            ? `${m.remainingTokensToday.toLocaleString()} токенов`
                            : "Без дневного лимита"}
                        </div>
                      </td>

                      {/* RPM */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono text-zinc-400">
                        {m.rpmLimit}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          В норме
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-500">
                    Моделей по заданным фильтрам не найдено.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
