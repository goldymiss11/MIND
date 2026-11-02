"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, CheckCircle2, FolderClosed, Home } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/tasks", label: "Задачи", icon: CheckCircle2 },
  { href: "/memory", label: "Память", icon: Brain },
  { href: "/artifacts", label: "Файлы", icon: FolderClosed },
];

export function Navigation() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/settings")) {
    return null;
  }

  return (
    <nav
      aria-label="Основная навигация"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto w-[calc(100%-1.5rem)] max-w-[456px]"
    >
      <div className="glass-dock pointer-events-auto flex items-center rounded-full p-[5px]">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={() => window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()}
              className={`flex h-[52px] flex-1 select-none flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-150 ${
                isActive ? "bg-ink/10 text-accent" : "text-ink/85"
              }`}
            >
              <Icon size={23} strokeWidth={2.2} />
              <span className="text-[11px] font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
