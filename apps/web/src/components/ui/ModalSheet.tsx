"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ModalSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}: ModalSheetProps) {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#16171b] border-t sm:border border-white/[0.08] rounded-t-[32px] sm:rounded-[32px] p-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] sm:shadow-2xl animate-sheet-up flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        {/* Mobile Drag Indicator Bar */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto -mt-2 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex justify-between items-start gap-3">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[#8e8e93] mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 flex items-center justify-center text-[#8e8e93] hover:text-white transition-all shrink-0"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="pt-1">{children}</div>
      </div>
    </div>
  );
}
