"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ModalSheet({ isOpen, onClose, title, subtitle, children }: ModalSheetProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="animate-fade-in fixed inset-0 z-[60] flex items-end justify-center bg-black/55"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up no-scrollbar relative max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[32px] bg-card px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-5"
      >
        <button
          onClick={onClose}
          className="pressable absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/10 text-ink/80"
          aria-label="Закрыть"
        >
          <X size={20} strokeWidth={2.4} />
        </button>

        {title && (
          <div className="mb-4 pr-12">
            <h2 className="break-words text-[22px] font-bold leading-7">{title}</h2>
            {subtitle && <p className="mt-1 text-[15px] leading-5 text-hint">{subtitle}</p>}
          </div>
        )}

        {children}
      </div>
    </div>,
    document.body
  );
}
