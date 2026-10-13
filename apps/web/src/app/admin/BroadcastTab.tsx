"use client";

import React, { useState, useRef } from "react";
import {
  Send,
  Users,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  Bot,
  Shield,
  HelpCircle,
  CheckCheck,
} from "lucide-react";
import { sendBroadcast } from "./actions";

interface BroadcastTabProps {
  totalUsers: number;
  adminSecret?: string;
}

interface BroadcastResult {
  success: boolean;
  sent: number;
  failed: number;
  total: number;
  error?: string;
}

const TEMPLATES = [
  {
    title: "📢 Обновление системы",
    text: `*🚀 Обновление MIND OS*\n\nМы обновили возможности искусственного интеллекта:\n• Добавлены новые модели генерации\n• Улучшена точность работы с артефактами\n• Повышена скорость ответов\n\n_Попробуйте отправить новый запрос прямо сейчас!_`,
  },
  {
    title: "⚡ Новый навык",
    text: `*✨ Новый навык в MIND OS!*\n\nТеперь бот умеет генерировать профессиональные таблицы и презентации еще быстрее.\n\nПросто напишите:\n\`Создай презентацию по теме: Стратегия развития 2026\``,
  },
  {
    title: "🛠 Технические работы",
    text: `*⚙️ Плановое обслуживание*\n\nСегодня в 03:00 по МСК будут проводиться технические работы по обновлению базы знаний.\nСервис может быть кратковременно недоступен в течение 5 минут.`,
  },
];

export function BroadcastTab({ totalUsers, adminSecret }: BroadcastTabProps) {
  const [messageText, setMessageText] = useState<string>("");
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Character limit for a single Telegram message
  const MAX_CHARS = 4096;
  const charsCount = messageText.length;
  const isOverLimit = charsCount > MAX_CHARS;

  // Formatting insert helper
  const insertFormatting = (prefix: string, suffix: string, defaultText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = messageText;
    const selectedText = currentText.substring(start, end) || defaultText;

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newText =
      currentText.substring(0, start) + replacement + currentText.substring(end);

    setMessageText(newText);

    // Restore focus and cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  };

  const handleSendBroadcast = async () => {
    setIsConfirmOpen(false);
    setIsSending(true);
    setResult(null);

    const effectiveSecret =
      adminSecret ||
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("secret") || ""
        : "");

    try {
      const res = await sendBroadcast(messageText, effectiveSecret);
      setResult(res);
      if (res.success && res.error === undefined) {
        // Broadcast succeeded, keep message visible for review or clear if preferred
      }
    } catch (err: any) {
      console.error("[BroadcastTab] Error:", err);
      setResult({
        success: false,
        sent: 0,
        failed: 0,
        total: totalUsers,
        error: err?.message || "Непредвиденная ошибка при отправке рассылки",
      });
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Safe parser for Telegram Markdown in preview bubble
   */
  const renderTelegramPreview = (rawText: string) => {
    if (!rawText.trim()) {
      return (
        <div className="text-zinc-500 italic py-8 text-center text-xs">
          Введите текст сообщения слева, чтобы увидеть предпросмотр в стиле Telegram...
        </div>
      );
    }

    // Split code blocks ```...``` first
    const parts = rawText.split(/(```[\s\S]*?```)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const code = part.slice(3, -3).replace(/^\n+|\n+$/g, "");
        return (
          <pre
            key={pIdx}
            className="my-2 p-2.5 rounded-xl bg-black/50 border border-zinc-700/60 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap select-all"
          >
            {code}
          </pre>
        );
      }

      const lines = part.split("\n");
      return (
        <React.Fragment key={pIdx}>
          {lines.map((line, lineIdx) => {
            const tokens = line.split(
              /(`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*|_[^_]+_)/g
            );

            return (
              <React.Fragment key={lineIdx}>
                {lineIdx > 0 && <br />}
                {tokens.map((token, tIdx) => {
                  if (token.startsWith("`") && token.endsWith("`")) {
                    return (
                      <code
                        key={tIdx}
                        className="px-1.5 py-0.5 rounded bg-black/40 text-emerald-300 font-mono text-xs border border-zinc-800"
                      >
                        {token.slice(1, -1)}
                      </code>
                    );
                  }
                  if (token.startsWith("*") && token.endsWith("*")) {
                    return (
                      <strong key={tIdx} className="font-bold text-white">
                        {token.slice(1, -1)}
                      </strong>
                    );
                  }
                  if (token.startsWith("_") && token.endsWith("_")) {
                    return (
                      <em key={tIdx} className="italic text-zinc-200">
                        {token.slice(1, -1)}
                      </em>
                    );
                  }
                  const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                  if (linkMatch) {
                    return (
                      <span
                        key={tIdx}
                        className="text-blue-400 underline decoration-blue-400/50 hover:text-blue-300 cursor-pointer"
                        title={linkMatch[2]}
                      >
                        {linkMatch[1]}
                      </span>
                    );
                  }
                  return <span key={tIdx}>{token}</span>;
                })}
              </React.Fragment>
            );
          })}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER SECTION */}
      <div className="rounded-3xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-6 sm:p-8 shadow-2xl shadow-black/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
                <Send className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Рассылка пользователям
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Users className="w-3.5 h-3.5" />
                {totalUsers.toLocaleString()} получателей
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl">
              Отправка системных уведомлений и анонсов всем зарегистрированным пользователям Telegram-бота MIND. Рассылка использует официальный Telegram Bot API с соблюдением глобальных лимитов (30 сообщений/сек).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs font-mono text-zinc-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Rate-Limit Safe (~25 req/s)
            </span>
          </div>
        </div>
      </div>

      {/* 2. RESULT BANNER (IF BROADCAST COMPLETED) */}
      {result && (
        <div
          className={`p-6 rounded-3xl border shadow-2xl transition-all ${
            result.success && !result.error
              ? "bg-emerald-950/20 border-emerald-500/40 shadow-emerald-500/5 text-emerald-100"
              : "bg-red-950/20 border-red-500/40 shadow-red-500/5 text-red-100"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              {result.success && !result.error ? (
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-lg shadow-red-500/10">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  {result.success && !result.error
                    ? "Рассылка успешно завершена!"
                    : "Ошибка при выполнении рассылки"}
                </h3>

                {result.error && (
                  <p className="text-xs text-red-300 font-mono bg-red-950/50 p-2.5 rounded-xl border border-red-900/50">
                    {result.error}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="px-4 py-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <div>
                      <div className="text-[11px] text-zinc-400">Успешно доставлено</div>
                      <div className="text-lg font-bold text-white font-mono">
                        {result.sent.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div>
                      <div className="text-[11px] text-zinc-400">Не доставлено (блок)</div>
                      <div className="text-lg font-bold text-white font-mono">
                        {result.failed.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <div>
                      <div className="text-[11px] text-zinc-400">Всего получателей</div>
                      <div className="text-lg font-bold text-white font-mono">
                        {result.total.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setResult(null)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 self-start shrink-0 transition-all"
            >
              Скрыть отчет
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN EDITOR & PREVIEW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-6 shadow-xl shadow-black/40 space-y-4">
            {/* Templates Quick Select */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Готовые шаблоны
              </label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMessageText(tmpl.text)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-950/80 hover:bg-zinc-800/80 text-zinc-300 border border-zinc-800 hover:border-blue-500/40 transition-all active:scale-95 text-left"
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="pt-2 border-t border-zinc-800/60">
              <div className="flex items-center justify-between pb-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Текст сообщения
                </label>
                <span
                  className={`text-xs font-mono ${
                    isOverLimit ? "text-red-400 font-bold" : "text-zinc-500"
                  }`}
                >
                  {charsCount} / {MAX_CHARS}
                </span>
              </div>

              {/* Formatting buttons */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5 p-1.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => insertFormatting("*", "*", "жирный текст")}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-all flex items-center gap-1"
                  title="Жирный текст (*текст*)"
                >
                  <Bold className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Жирный</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("_", "_", "курсив")}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-all flex items-center gap-1"
                  title="Курсив (_текст_)"
                >
                  <Italic className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Курсив</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("`", "`", "код")}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-all flex items-center gap-1"
                  title="Инлайн код (`код`)"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Код</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertFormatting("[", "](https://t.me/mindopus_bot)", "ссылка")
                  }
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-all flex items-center gap-1"
                  title="Ссылка ([текст](url))"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ссылка</span>
                </button>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={isSending}
                rows={12}
                placeholder="Напишите текст рассылки... Поддерживается Telegram Markdown: *жирный*, _курсив_, `код`, [ссылка](url)"
                className="w-full rounded-2xl bg-zinc-950/80 border border-zinc-800 p-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all resize-y font-sans leading-relaxed disabled:opacity-50"
              />

              {/* Markdown Hint */}
              <div className="mt-2.5 flex items-start gap-2 text-[11px] text-zinc-500">
                <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-400" />
                <span>
                  Поддерживается разметка Markdown: <code>*жирный*</code>, <code>_курсив_</code>, <code>`код`</code>, <code>[текст](url)</code>. Если разметка будет содержать синтаксическую ошибку, сообщение автоматически доставится обычным текстом без сбоев.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMessageText("")}
                disabled={!messageText || isSending}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Очистить поле
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                disabled={!messageText.trim() || isOverLimit || isSending}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-blue-600/30 transition-all"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Идёт отправка...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Отправить всем ({totalUsers.toLocaleString()} пользователей)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Telegram Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-5 shadow-xl shadow-black/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-400" />
                Live Предпросмотр (Telegram)
              </h3>
              <span className="text-[11px] font-mono text-zinc-500">
                Вид в чате
              </span>
            </div>

            {/* Mock Telegram Chat Container */}
            <div className="rounded-2xl bg-[#0f141c] border border-zinc-800/90 overflow-hidden shadow-inner flex flex-col min-h-[380px]">
              {/* Telegram Chat Header */}
              <div className="p-3 bg-[#17212b] border-b border-zinc-800/80 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                  M
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">MIND OS</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400">
                      bot
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400">Personal AI Operating System</div>
                </div>
              </div>

              {/* Chat Canvas */}
              <div className="p-4 flex-1 flex flex-col justify-end bg-gradient-to-b from-[#0e1621] to-[#0a0f18]">
                {/* Telegram Message Bubble */}
                <div className="self-start max-w-[92%] rounded-2xl rounded-tl-sm bg-[#182533] border border-blue-500/20 text-zinc-100 p-3.5 shadow-xl text-xs sm:text-sm leading-relaxed relative space-y-2">
                  <div className="font-sans break-words">
                    {renderTelegramPreview(messageText)}
                  </div>

                  {/* Message footer timestamp + checkmarks */}
                  <div className="flex items-center justify-end gap-1 pt-1 text-[10px] text-zinc-400 font-mono select-none">
                    <span>
                      {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <CheckCheck className="w-3.5 h-3.5 text-blue-400 inline" />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 px-1">
              * Сообщение будет доставлено в личный диалог с ботом от имени официального аккаунта MIND.
            </div>
          </div>
        </div>
      </div>

      {/* 4. CONFIRMATION MODAL */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-zinc-900 border border-zinc-700/80 p-6 sm:p-7 space-y-5 shadow-2xl shadow-black">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Подтверждение отправки рассылки
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Вы собираетесь отправить это сообщение{" "}
                <span className="font-bold text-blue-400">
                  {totalUsers.toLocaleString()} зарегистрированным пользователям
                </span>{" "}
                бота MIND. Это действие нельзя отменить.
              </p>
            </div>

            {/* Message snippet */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 max-h-32 overflow-y-auto font-sans whitespace-pre-wrap">
              {messageText}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSendBroadcast}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Да, отправить всем</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
