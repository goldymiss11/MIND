"use client";

import { useTelegram } from "../../lib/telegram/useTelegram";
import {
  Settings,
  LogOut,
  Sparkles,
  Database,
  ShieldCheck,
  Palette,
  Smartphone,
  ChevronRight,
  Check,
} from "lucide-react";

export default function SettingsPage() {
  const { user, isReady, close } = useTelegram();

  if (!isReady) return null;

  return (
    <main className="p-4 flex flex-col gap-4 min-h-screen bg-[#000000] text-white pb-28">
      <header className="mt-2 mb-1">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white tracking-tight">
          <Settings size={26} className="text-[#007aff]" /> Настройки
        </h1>
      </header>

      {/* Profile Card */}
      <div className="bg-[#1c1c1e] rounded-3xl p-4 flex items-center gap-3.5 border border-white/5 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#007aff] to-[#00c6ff] p-[2px] shadow-lg">
          <div className="w-full h-full rounded-full bg-[#1c1c1e] flex items-center justify-center text-white text-xl font-bold">
            {user?.first_name?.charAt(0) || "А"}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-white font-semibold text-base truncate">
              {user?.first_name || "Александр"} {user?.last_name || ""}
            </h2>
            <span className="text-[10px] bg-[#007aff]/20 text-[#007aff] px-2 py-0.5 rounded-full font-bold">
              ★ Premium
            </span>
          </div>
          <p className="text-[#8e8e93] text-xs mt-0.5 truncate">
            @{user?.username || "alexandr_mind"}
          </p>
        </div>
      </div>

      {/* Group: AI & Orchestrator */}
      <div>
        <p className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 px-1">
          Искусственный Интеллект
        </p>
        <div className="bg-[#1c1c1e] rounded-3xl divide-y divide-white/5 overflow-hidden border border-white/5">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#007aff]/15 text-[#007aff] flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">AI Orchestrator</p>
                <p className="text-xs text-[#8e8e93]">Центральный маршрутизатор</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse"></span>
              <span className="text-xs font-medium text-[#30d158]">Активен</span>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#af52de]/15 text-[#af52de] flex items-center justify-center">
                <Database size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Векторная память</p>
                <p className="text-xs text-[#8e8e93]">pgvector long-term storage</p>
              </div>
            </div>
            <span className="text-xs text-[#8e8e93]">1536 dim</span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#30d158]/15 text-[#30d158] flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Режим автономии</p>
                <p className="text-xs text-[#8e8e93]">Подтверждение важных действий</p>
              </div>
            </div>
            <span className="text-xs text-[#007aff] font-medium">CONFIRM</span>
          </div>
        </div>
      </div>

      {/* Group: Interface & Preferences */}
      <div>
        <p className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 px-1">
          Интерфейс
        </p>
        <div className="bg-[#1c1c1e] rounded-3xl divide-y divide-white/5 overflow-hidden border border-white/5">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center">
                <Palette size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Цветовая тема</p>
                <p className="text-xs text-[#8e8e93]">Telegram OLED Black</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Check size={14} className="text-[#007aff]" />
              <span className="text-xs text-[#8e8e93]">По умолчанию</span>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#ff9500]/15 text-[#ff9500] flex items-center justify-center">
                <Smartphone size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Тактильный отклик</p>
                <p className="text-xs text-[#8e8e93]">Haptic feedback при нажатиях</p>
              </div>
            </div>
            <span className="text-xs text-[#30d158] font-medium">Включён</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-2">
        <button
          onClick={close}
          className="w-full bg-[#1c1c1e] hover:bg-rose-500/10 active:bg-rose-500/20 text-rose-400 p-4 rounded-3xl flex items-center justify-between transition-colors border border-white/5"
        >
          <div className="flex items-center gap-3">
            <LogOut size={18} />
            <span className="text-sm font-medium">Закрыть Mini App</span>
          </div>
          <ChevronRight size={16} className="text-[#8e8e93]" />
        </button>
      </div>

      <div className="text-center text-[11px] text-[#8e8e93] mt-2">
        MIND Personal AI OS v1.0 • Telegram-First Monolith
      </div>
    </main>
  );
}

