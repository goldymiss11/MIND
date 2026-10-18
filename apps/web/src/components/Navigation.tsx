"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, Brain, FileText, Settings } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const navItems = [
    { href: "/", label: "Главная", icon: Home },
    { href: "/tasks", label: "Задачи", icon: CheckSquare },
    { href: "/memory", label: "Память", icon: Brain },
    { href: "/artifacts", label: "Файлы", icon: FileText },
    { href: "/settings", label: "Настройки", icon: Settings },
  ];

  const handleTabClick = () => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback) {
      try {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
      } catch {
        // Safe ignore
      }
    }
  };

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed bottom-4 sm:bottom-6 inset-x-0 mx-auto w-[calc(100%-1.5rem)] max-w-[400px] z-50 pointer-events-none pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="pointer-events-auto relative rounded-full p-1.5 flex justify-between items-center glass-dock transition-all">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleTabClick}
              className={`relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-full transition-all duration-200 select-none ${
                isActive
                  ? "glass-pill-active text-[#007aff]"
                  : "text-[#8e8e93] hover:text-white/95 hover:bg-white/[0.04] active:scale-92 active:opacity-75"
              }`}
            >
              <div className="relative flex items-center justify-center">
                {isActive && (
                  <div
                    aria-hidden="true"
                    className="absolute -inset-1.5 bg-[#007aff]/30 blur-sm rounded-full pointer-events-none"
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.4 : 1.9}
                  className={`relative transition-transform duration-200 ${
                    isActive ? "scale-105 text-[#007aff]" : "text-[#8e8e93]"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 leading-none select-none transition-colors duration-200 ${
                  isActive ? "text-[#007aff] font-semibold" : "text-[#8e8e93] font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

