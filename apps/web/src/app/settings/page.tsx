"use client";

import { useTelegram } from "../../lib/telegram/useTelegram";
import { Settings, LogOut } from "lucide-react";

export default function SettingsPage() {
  const { user, isReady, close } = useTelegram();

  if (!isReady) return null;

  return (
    <main className="p-4 flex flex-col gap-4 min-h-screen bg-[#000000] text-white pb-24">
      <header className="mt-2 mb-1">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white tracking-tight">
          <Settings size={26} className="text-[#007aff]" /> Настройки
        </h1>
      </header>

      <div className="bg-[#1c1c1e] rounded-3xl divide-y divide-white/5 overflow-hidden">
        <div className="p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 bg-[#007aff] rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md">
            {user?.first_name?.charAt(0) || "U"}
          </div>
          <div>
            <h2 className="text-white font-semibold text-[15px]">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-[#8e8e93] text-xs mt-0.5">@{user?.username || "user"}</p>
          </div>
        </div>

        <button
          className="w-full p-4 flex items-center gap-3 text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors text-sm font-medium"
          onClick={close}
        >
          <LogOut size={18} />
          <span>Закрыть Mini App</span>
        </button>
      </div>
    </main>
  );
}
