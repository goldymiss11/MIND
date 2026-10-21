"use client";

import { useTelegram } from "../../lib/telegram/useTelegram";
import {
  LogOut,
  Sparkles,
  Database,
  ShieldCheck,
  Palette,
  Smartphone,
  ChevronRight,
  Check,
} from "lucide-react";
import { CardGroup } from "../../components/ui/CardGroup";
import { RowItem } from "../../components/ui/RowItem";

export default function SettingsPage() {
  const { user, isReady, close, haptic } = useTelegram();

  if (!isReady) {
    return (
      <main className="p-4 flex flex-col gap-4 min-h-screen bg-[#000000] text-white">
        <header className="mt-2 mb-1">
          <div className="h-7 w-32 rounded-md skeleton-shimmer" />
        </header>
        <div className="h-20 rounded-[24px] skeleton-shimmer" />
        <div className="space-y-2">
          <div className="h-4 w-36 rounded-md skeleton-shimmer" />
          <div className="h-40 rounded-[24px] skeleton-shimmer" />
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 pb-32 flex flex-col gap-4 min-h-screen bg-[#000000] text-white">
      {/* Header */}
      <header className="mt-2 mb-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">Настройки</h1>
      </header>

      {/* Profile Card (Wallet avatar style) */}
      <div className="bg-[#16171b] rounded-[24px] p-4 flex items-center gap-3.5 border border-white/[0.07] shadow-sm">
        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#007aff] to-[#30d158] p-[2px] shadow-lg shrink-0">
          <div className="w-full h-full rounded-full bg-[#16171b] flex items-center justify-center text-white text-xl font-bold">
            {user?.first_name?.charAt(0) || "А"}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-semibold text-[16px] truncate tracking-tight">
              {user?.first_name || "Александр"} {user?.last_name || ""}
            </h2>
            <span className="text-[10px] bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30 px-2 py-0.5 rounded-full font-bold">
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
        <p className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 px-1">
          Искусственный Интеллект
        </p>
        <CardGroup>
          <RowItem
            icon={<Sparkles size={18} />}
            iconBg="bg-[#007aff]/15"
            iconColor="text-[#007aff]"
            title="AI Orchestrator"
            subtitle="Центральный маршрутизатор"
            right={
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse" />
                <span className="text-xs font-semibold text-[#30d158]">Активен</span>
              </div>
            }
          />

          <RowItem
            icon={<Database size={18} />}
            iconBg="bg-[#af52de]/15"
            iconColor="text-[#af52de]"
            title="Векторная память"
            subtitle="pgvector long-term storage"
            right={<span className="text-xs text-[#8e8e93] font-mono">1536 dim</span>}
          />

          <RowItem
            icon={<ShieldCheck size={18} />}
            iconBg="bg-[#30d158]/15"
            iconColor="text-[#30d158]"
            title="Режим автономии"
            subtitle="Подтверждение важных действий"
            right={
              <span className="text-[11px] font-bold text-[#007aff] bg-[#007aff]/15 border border-[#007aff]/25 px-2.5 py-0.5 rounded-full">
                CONFIRM
              </span>
            }
          />
        </CardGroup>
      </div>

      {/* Group: Interface & Preferences */}
      <div>
        <p className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 px-1">
          Интерфейс
        </p>
        <CardGroup>
          <RowItem
            icon={<Palette size={18} />}
            iconBg="bg-white/10"
            iconColor="text-white"
            title="Цветовая тема"
            subtitle="Telegram OLED Black"
            right={
              <div className="flex items-center gap-1.5">
                <Check size={14} className="text-[#007aff]" strokeWidth={2.5} />
                <span className="text-xs text-[#8e8e93]">По умолчанию</span>
              </div>
            }
          />

          <RowItem
            icon={<Smartphone size={18} />}
            iconBg="bg-[#ff9500]/15"
            iconColor="text-[#ff9500]"
            title="Тактильный отклик"
            subtitle="Haptic feedback при нажатиях"
            right={<span className="text-xs text-[#30d158] font-semibold">Включён</span>}
          />
        </CardGroup>
      </div>

      {/* Danger Actions */}
      <div className="mt-1">
        <button
          onClick={() => {
            haptic.impact("medium");
            close();
          }}
          className="w-full bg-[#16171b] hover:bg-rose-500/10 active:bg-rose-500/20 text-rose-400 p-4 rounded-[24px] flex items-center justify-between transition-all border border-white/[0.07] touch-subtle"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <LogOut size={16} />
            </div>
            <span className="text-[14px] font-semibold">Закрыть Mini App</span>
          </div>
          <ChevronRight size={16} className="text-[#54575c]" />
        </button>
      </div>

      <div className="text-center text-[11px] text-[#8e8e93] mt-2 mb-4">
        MIND Personal AI OS v1.0 • Telegram-First Monolith
      </div>
    </main>
  );
}
