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
    { href: "/", label: "Home", icon: Home },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/memory", label: "Memory", icon: Brain },
    { href: "/artifacts", label: "Artifacts", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/10 rounded-full px-3 py-2 flex justify-around items-center shadow-2xl">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-all ${
                isActive
                  ? "bg-white/10 text-[#007aff] rounded-full px-3.5 py-1.5 flex flex-col items-center"
                  : "text-[#8e8e93] hover:text-white flex flex-col items-center py-1.5 px-2"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
