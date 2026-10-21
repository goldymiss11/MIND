import React from "react";

export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-2xl ${className}`} />;
}

export function CardGroupSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-[#16171b] border border-white/[0.07] rounded-[24px] divide-y divide-white/[0.05] overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-3 min-h-[58px]">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-full skeleton-shimmer shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/5 rounded-md skeleton-shimmer" />
              <div className="h-3 w-2/5 rounded-md skeleton-shimmer" />
            </div>
          </div>
          <div className="w-6 h-4 rounded-md skeleton-shimmer shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="p-4 flex flex-col gap-4 min-h-screen bg-[#000000] text-white">
      {/* Header */}
      <div className="flex justify-between items-center pt-2 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full skeleton-shimmer shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 rounded-md skeleton-shimmer" />
            <div className="h-3 w-20 rounded-md skeleton-shimmer" />
          </div>
        </div>
        <div className="w-10 h-10 rounded-full skeleton-shimmer shrink-0" />
      </div>

      {/* Hero */}
      <div className="py-6 flex flex-col items-center justify-center text-center space-y-2.5">
        <div className="h-3 w-28 rounded-md skeleton-shimmer" />
        <div className="h-10 w-44 rounded-xl skeleton-shimmer" />
        <div className="h-6 w-32 rounded-full skeleton-shimmer" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2 my-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-13 h-13 rounded-full skeleton-shimmer" />
            <div className="h-2.5 w-10 rounded-md skeleton-shimmer" />
          </div>
        ))}
      </div>

      {/* Announcement Card */}
      <div className="h-24 rounded-3xl skeleton-shimmer my-1" />

      {/* Sections */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded-md skeleton-shimmer" />
          <CardGroupSkeleton rows={2} />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 rounded-md skeleton-shimmer" />
          <CardGroupSkeleton rows={3} />
        </div>
      </div>
    </div>
  );
}
