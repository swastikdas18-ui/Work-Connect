"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

const navItems: NavItem[] = [
  { label: "Feed", href: "/feed", icon: Home },
  { label: "Members", href: "/members", icon: Users },
  { label: "Chats", href: "/channels/general", icon: MessageSquare, badgeCount: 3 },
  { label: "Events", href: "/events", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t border-zinc-200 bg-white/95 px-2 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/" || item.href === "/feed"
            ? pathname === "/" || pathname === "/feed"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-xs font-medium transition-colors",
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            )}
          >
            <div className="relative">
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-150",
                  isActive && "scale-110"
                )}
              />
              {Boolean(item.badgeCount) && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-xs">
                  {item.badgeCount}
                </span>
              )}
            </div>
            <span className="leading-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

