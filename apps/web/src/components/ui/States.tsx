"use client";

import React from "react";

export function ScreenHero({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col items-center px-4 pb-4 pt-5 text-center">
      <span className="text-[76px] leading-[88px]" aria-hidden>
        {emoji}
      </span>
      <h1 className="mt-2 text-[28px] font-bold leading-8">{title}</h1>
      {children && <div className="mt-2 text-[17px] leading-[23px]">{children}</div>}
    </header>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="screen items-center justify-center text-center">
      <span className="text-[64px]" aria-hidden>
        😕
      </span>
      <h1 className="text-[22px] font-bold">Не удалось загрузить</h1>
      <p className="mb-3 max-w-xs text-[15px] text-hint">{message}</p>
      <button onClick={onRetry} className="btn-primary max-w-[240px]">
        Повторить
      </button>
    </main>
  );
}

export function OutsideTelegram() {
  return (
    <main className="screen items-center justify-center text-center">
      <span className="text-[64px]" aria-hidden>
        🧠
      </span>
      <h1 className="text-[22px] font-bold">Откройте MIND в Telegram</h1>
      <p className="max-w-xs text-[15px] text-hint">Это мини-приложение работает внутри чата с ботом.</p>
    </main>
  );
}

export function EmptyState({ emoji, title, hint }: { emoji: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="text-[48px]" aria-hidden>
        {emoji}
      </span>
      <p className="mt-2 text-[17px] font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-[280px] text-[15px] leading-5 text-hint">{hint}</p>}
    </div>
  );
}
