import React from "react";

interface CardGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function CardGroup({ children, className = "" }: CardGroupProps) {
  return <div className={`group-card rows ${className}`}>{children}</div>;
}
