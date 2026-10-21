"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, Brain, FileText, Settings } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  // Hide navigation in admin dashboard
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
      className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] inset-x-0 mx-auto w-[calc(100%-1.5rem)] max-w-[390px] z-40 pointer-events-none"
    >
      <div className="pointer-events-auto relative rounded-full p-1 flex justify-between items-center glass-dock">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleTabClick}
              className={`relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-full transition-all duration-150 select-none ${
                isActive
                  ? "glass-pill-active text-[#007aff]"
                  : "text-[#8e8e93] hover:text-white/90 hover:bg-white/[0.04] active:scale-95"
              }`}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.4 : 2}
                className={`transition-colors duration-150 ${
                  isActive ? "text-[#007aff]" : "text-[#8e8e93]"
                }`}
              />
              <span
                className={`text-[10px] tracking-tight mt-1 leading-none select-none transition-colors duration-150 ${
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

