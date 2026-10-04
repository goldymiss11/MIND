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
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2">
      <div className="bg-[#1c1c1d]/90 backdrop-blur-md rounded-3xl flex justify-around items-center p-2 shadow-lg">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-colors ${
                isActive ? "text-[#2481cc]" : "text-[#999999] hover:text-white"
              }`}
            >
              <div className={`p-1 ${isActive ? 'bg-[#2481cc]/20 rounded-full' : ''}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
