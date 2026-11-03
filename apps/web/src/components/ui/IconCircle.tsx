import React from "react";
import type { LucideIcon } from "lucide-react";

interface IconCircleProps {
  icon: LucideIcon;
  /** Tailwind background class. */
  color: string;
  size?: number;
}

export function IconCircle({ icon: Icon, color, size = 44 }: IconCircleProps) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full text-white ${color}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.52)} strokeWidth={2.2} />
    </span>
  );
}
