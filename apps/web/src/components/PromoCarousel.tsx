"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { readStored, writeStored } from "../lib/storage";

const SLIDES = [
  { emoji: "📄", title: "Реферат по ГОСТу за минуту", text: "Напишите тему боту" },
  { emoji: "✏️", title: "Присылайте свои файлы", text: "Поправлю docx, xlsx и pptx" },
  { emoji: "⏰", title: "Напомню точно в срок", text: "«Каждый понедельник в 9»" },
  { emoji: "🎙️", title: "Можно голосом", text: "Голосовые и фото тоже понимаю" },
];

export function PromoCarousel({ onMore }: { onMore: () => void }) {
  const [hidden, setHidden] = useState(true);
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHidden(readStored("promoHidden") === "1");
  }, []);

  if (hidden) return null;

  return (
    <div className="promo-gradient relative overflow-hidden rounded-[24px] text-white">
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {SLIDES.map((slide) => (
          <button
            key={slide.title}
            onClick={onMore}
            className="relative flex h-[118px] w-full shrink-0 snap-center flex-col justify-center pl-5 pr-[92px] text-left"
          >
            <span className="text-[19px] font-bold leading-6">{slide.title}</span>
            <span className="mt-1 flex items-center text-[15px] text-white/90">
              {slide.text}
              <ChevronRight size={16} strokeWidth={2.5} className="shrink-0" />
            </span>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[58px] leading-none" aria-hidden>
              {slide.emoji}
            </span>
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2.5 left-5 flex gap-1.5">
        {SLIDES.map((slide, i) => (
          <span
            key={slide.title}
            className={`h-1.5 rounded-full transition-all duration-200 ${i === active ? "w-4 bg-white" : "w-1.5 bg-white/45"}`}
          />
        ))}
      </div>

      <button
        onClick={() => {
          writeStored("promoHidden", "1");
          setHidden(true);
        }}
        className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/25"
        aria-label="Скрыть"
      >
        <X size={16} strokeWidth={2.6} />
      </button>
    </div>
  );
}
