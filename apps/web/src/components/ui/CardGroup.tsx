import React from "react";

interface CardGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function CardGroup({ children, className = "" }: CardGroupProps) {
  return (
    <div
      className={`bg-[#16171b] border border-white/[0.07] rounded-[24px] divide-y divide-white/[0.05] overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.4)] ${className}`}
    >
      {children}
    </div>
  );
}
