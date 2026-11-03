"use client";

import React from "react";
import { BellRing, FileText, MessageCircle } from "lucide-react";
import { ModalSheet } from "./ui/ModalSheet";

const POINTS = [
  {
    icon: FileText,
    title: "Делает файлы прямо в чате",
    text: "Реферат по ГОСТу, презентация, таблица или код. Просто попросите в сообщении.",
  },
  {
    icon: MessageCircle,
    title: "Понимает всё, что вы пришлёте",
    text: "Голосовые, фото и документы. Пришлите свой файл, и MIND внесёт правки.",
  },
  {
    icon: BellRing,
    title: "Помнит и напоминает",
    text: "Запоминает важное о вас и напомнит вовремя, даже если повторять каждую неделю.",
  },
];

export function Onboarding({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <ModalSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center pt-4 text-center">
        <span className="text-[84px] leading-[96px]" aria-hidden>
          🧠
        </span>
        <h2 className="mt-3 px-4 text-[26px] font-bold leading-8">
          Второй мозг в вашем Telegram
        </h2>
      </div>
      <ul className="mt-6 flex flex-col gap-5 px-1">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-4">
            <Icon size={28} className="mt-0.5 shrink-0 text-accent" strokeWidth={2} />
            <div>
              <p className="text-[17px] font-bold leading-[22px]">{title}</p>
              <p className="mt-0.5 text-[15px] leading-5 text-hint">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <button onClick={onClose} className="btn-primary mt-7">
        Понятно
      </button>
    </ModalSheet>
  );
}
