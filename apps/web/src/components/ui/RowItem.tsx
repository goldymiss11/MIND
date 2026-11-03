import React from "react";
import { ChevronRight } from "lucide-react";

interface RowItemProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  rightSub?: React.ReactNode;
  showChevron?: boolean;
  /** Let the title wrap instead of cutting it to one line. */
  wrap?: boolean;
  onClick?: () => void;
  className?: string;
}

export function RowItem({
  icon,
  title,
  subtitle,
  right,
  rightSub,
  showChevron = false,
  wrap = false,
  onClick,
  className = "",
}: RowItemProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={`flex min-h-[64px] items-center gap-3.5 bg-card px-4 py-2.5 ${onClick ? "row-press" : ""} ${className}`}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <div className={`text-[17px] font-semibold leading-[22px] ${wrap ? "break-words" : "truncate"}`}>{title}</div>
        {subtitle && <div className="mt-0.5 truncate text-[15px] leading-5 text-hint">{subtitle}</div>}
      </div>
      {(right || rightSub) && (
        <div className="shrink-0 text-right">
          {right && <div className="text-[17px] font-medium leading-[22px]">{right}</div>}
          {rightSub && <div className="mt-0.5 text-[15px] leading-5 text-hint">{rightSub}</div>}
        </div>
      )}
      {showChevron && <ChevronRight size={20} className="-mr-1 shrink-0 text-hint/70" strokeWidth={2.5} />}
    </div>
  );
}
