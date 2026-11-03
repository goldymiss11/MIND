import React from "react";

export function CardGroupSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="group-card">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex min-h-[64px] items-center gap-3.5 px-4 py-2.5">
          <div className="skeleton-shimmer h-11 w-11 shrink-0 rounded-full" style={{ backgroundColor: "rgb(var(--card-raised))" }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/5 rounded-md bg-ink/10" />
            <div className="h-3 w-2/5 rounded-md bg-ink/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton() {
  return (
    <main className="screen" aria-busy="true">
      <div className="flex flex-col items-center gap-3 pb-4 pt-5">
        <div className="skeleton-shimmer h-20 w-20 rounded-full" />
        <div className="skeleton-shimmer h-7 w-36 rounded-lg" />
        <div className="skeleton-shimmer h-4 w-56 rounded-md" />
      </div>
      <CardGroupSkeleton rows={4} />
    </main>
  );
}

export function HomeSkeleton() {
  return (
    <main className="screen" aria-busy="true">
      <div className="flex justify-between">
        <div className="skeleton-shimmer h-11 w-11 rounded-full" />
        <div className="skeleton-shimmer h-11 w-11 rounded-full" />
      </div>
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="skeleton-shimmer h-4 w-24 rounded-md" />
        <div className="skeleton-shimmer h-16 w-24 rounded-2xl" />
        <div className="skeleton-shimmer h-6 w-44 rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-[84px] rounded-[20px]" />
        ))}
      </div>
      <div className="skeleton-shimmer h-[118px] rounded-[24px]" />
      <CardGroupSkeleton rows={3} />
    </main>
  );
}
