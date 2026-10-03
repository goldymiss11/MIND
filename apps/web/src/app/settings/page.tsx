"use client";

import { useTelegram } from "../../lib/telegram/useTelegram";
import { Settings, LogOut } from "lucide-react";

export default function SettingsPage() {
  const { user, isReady, close } = useTelegram();

  if (!isReady) return null;

  return (
    <main className="p-4 flex flex-col gap-4 min-h-screen pb-24">
      <header className="mt-2 mb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings size={28} className="text-[#2481cc]" /> Settings
        </h1>
      </header>

      <div className="bg-[#1c1c1d] rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-12 h-12 bg-[#2481cc] rounded-full flex items-center justify-center text-white text-lg font-bold">
            {user?.first_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-white font-medium">{user?.first_name} {user?.last_name}</h2>
            <p className="text-[#999999] text-sm">@{user?.username || 'user'}</p>
          </div>
        </div>

        <button className="flex items-center gap-3 text-red-500 py-2" onClick={close}>
          <LogOut size={20} />
          <span>Close Mini App</span>
        </button>
      </div>
    </main>
  );
}
