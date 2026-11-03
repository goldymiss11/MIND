"use client";

import React from "react";

interface SegmentedProps<T extends string> {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

/** Text tabs where the active one sits on a soft pill, as on Wallet's earn screen. */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <div role="tablist" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4">
      {options.map((option) => {
        const isActive = option.id === value;
        return (
          <button
            key={option.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
              onChange(option.id);
            }}
            className={`h-[38px] shrink-0 whitespace-nowrap rounded-full px-[18px] text-[17px] font-bold transition-colors duration-150 ${
              isActive ? "bg-card text-ink" : "text-hint"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
