"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, MessageSquare, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMounted } from "@/lib/hooks/useMounted";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

const navItems: NavItem[] = [
  { label: "Feed", href: "/feed", icon: Home },
  { label: "Events", href: "/events", icon: Calendar },
  { label: "Chat", href: "/channels/general", icon: MessageSquare, badgeCount: 3 },
  { label: "Members", href: "/members", icon: Users },
  { label: "Profile", href: "/profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const mounted = useIsMounted();

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t border-zinc-800 bg-zinc-950/80 px-2 backdrop-blur-lg"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          mounted &&
          (item.href === "/" || item.href === "/feed"
            ? pathname === "/" || pathname === "/feed"
            : pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-medium transition-colors",
              isActive
                ? "text-blue-500"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {item.badgeCount ? (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
                  {item.badgeCount}
                </span>
              ) : null}
            </div>
            <span>{item.label}</span>
            {isActive && (
              <span className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-500" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

