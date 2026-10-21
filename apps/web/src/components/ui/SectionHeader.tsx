import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export function SectionHeader({
  title,
  actionHref,
  actionLabel = "Все",
  className = "",
}: SectionHeaderProps) {
  return (
    <div
      className={`flex justify-between items-center text-[15px] font-semibold text-white px-1 mb-2.5 ${className}`}
    >
      <span>{title}</span>
      {actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-0.5 text-[#007aff] text-xs font-semibold hover:opacity-85 active:opacity-70 transition-opacity"
        >
          <span>{actionLabel}</span>
          <ChevronRight size={14} strokeWidth={2.5} />
        </Link>
      )}
    </div>
  );
}
