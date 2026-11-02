"use client";

import React, { useRef, useState } from "react";

interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: string;
  onTrigger: () => void;
}

interface SwipeRowProps {
  /** Revealed by swiping right. */
  left?: SwipeAction;
  /** Revealed by swiping left. */
  right?: SwipeAction;
  children: React.ReactNode;
}

const TRIGGER_PX = 88;

/** A list row that fires an action when dragged far enough. Tap and vertical scroll pass through. */
export function SwipeRow({ left, right, children }: SwipeRowProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; locked: boolean | null } | null>(null);
  const passedTrigger = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    start.current = { x: e.clientX, y: e.clientY, locked: null };
    passedTrigger.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;

    if (s.locked === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.locked = Math.abs(dx) > Math.abs(dy);
      if (s.locked) setDragging(true);
    }
    if (!s.locked) return;

    const allowed = (dx > 0 && left) || (dx < 0 && right) ? dx : 0;
    setOffset(allowed);

    const past = Math.abs(allowed) >= TRIGGER_PX;
    if (past !== passedTrigger.current) {
      passedTrigger.current = past;
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    }
  };

  const finish = () => {
    const wasSwipe = start.current?.locked === true;
    start.current = null;
    setDragging(false);
    if (wasSwipe && Math.abs(offset) >= TRIGGER_PX) {
      (offset > 0 ? left : right)?.onTrigger();
    }
    setOffset(0);
  };

  const action = offset > 0 ? left : offset < 0 ? right : undefined;

  return (
    <div className="relative overflow-hidden" style={{ touchAction: "pan-y" }}>
      {action && (
        <div
          className={`absolute inset-0 flex items-center gap-2 px-5 text-[15px] font-semibold text-white ${action.color} ${
            offset > 0 ? "justify-start" : "justify-end"
          }`}
        >
          {action.icon}
          {action.label}
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={(e) => {
          if (Math.abs(offset) > 8) e.stopPropagation();
        }}
        className={`relative ${dragging ? "" : "transition-transform duration-200"}`}
        style={{ transform: `translateX(${offset}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
