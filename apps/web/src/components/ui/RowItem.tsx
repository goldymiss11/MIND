import React from "react";
import { ChevronRight } from "lucide-react";

interface RowItemProps {
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  className?: string;
}

export function RowItem({
  icon,
  iconBg = "bg-[#007aff]/15",
  iconColor = "text-[#007aff]",
  title,
  subtitle,
  right,
  showChevron = false,
  onClick,
  className = "",
}: RowItemProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3.5 flex items-center justify-between gap-3 min-h-[58px] transition-colors ${
        isClickable
          ? "cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.06] select-none"
          : ""
      } ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {icon && (
          <div
            className={`w-11 h-11 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-sm`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-white tracking-tight leading-snug truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-[13px] text-[#8e8e93] font-normal leading-tight mt-0.5 truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {(right || showChevron) && (
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {right}
          {showChevron && <ChevronRight size={17} className="text-[#54575c]" />}
        </div>
      )}
    </div>
  );
}
