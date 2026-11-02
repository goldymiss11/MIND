import React from "react";
import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  /** Muted text on the right, such as a total. */
  aside?: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
}

export function SectionHeader({ title, aside, actionHref, actionLabel = "Все" }: SectionHeaderProps) {
  return (
    <div className="mt-3 flex items-baseline justify-between px-1.5 pb-0.5">
      <h2 className="text-[20px] font-bold text-hint">{title}</h2>
      {aside && <span className="text-[15px] text-hint">{aside}</span>}
      {actionHref && (
        <Link href={actionHref} className="text-[15px] font-medium text-accent active:opacity-60">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
