"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, LogOut, ChevronDown, Sparkles } from "lucide-react";
import { NotificationCenter } from "@/components/community/NotificationCenter";
import { createBrowserSupabaseClient } from "@/lib/db/browser";
import { useStoredUser, useIsMounted } from "@/lib/hooks/useMounted";

export interface HeaderProps {
  tenantId: string;
  currentUserId: string;
}

export function Header({ tenantId, currentUserId }: HeaderProps) {
  const router = useRouter();
  const mounted = useIsMounted();
  const storedUser = useStoredUser();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const userProfile = mounted
    ? storedUser
    : {
        name: "Alex Carter",
        role: "intern",
        email: "alex.carter@workconnect.internal",
      };

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut().catch(() => null);
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("work_connect_user");
        document.cookie = "work_connect_tenant_id=; path=/; max-age=0";
        document.cookie = "work_connect_user_role=; path=/; max-age=0";
      }
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 md:px-6">
      {/* Left: Branding & Community Badge */}
      <div className="flex items-center gap-3">
        <Link href="/feed" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xs">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Work-Connect
          </span>
        </Link>

        <span className="hidden items-center gap-1 rounded-full border border-blue-500/20 bg-blue-50/50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-400 sm:inline-flex">
          <Sparkles className="h-3 w-3" />
          <span>Active Workspace</span>
        </span>
      </div>

      {/* Right: Notifications, Presence Dot & User Profile Dropdown */}
      <div className="flex items-center gap-3">
        {/* Notification Bell Center */}
        <NotificationCenter tenantId={tenantId} userId={currentUserId} />

        {/* User Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-xl p-1 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
            aria-label="User profile menu"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-semibold text-white shadow-xs">
              {mounted ? userProfile.name.slice(0, 2).toUpperCase() : "AC"}
              {/* Online status indicator */}
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950" />
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                {mounted ? userProfile.name : "Alex Carter"}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {mounted ? userProfile.role : "intern"}
              </p>
            </div>

            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-100">
                <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {userProfile.name}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                    {userProfile.email}
                  </p>
                  <span className="mt-1 inline-block rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 uppercase dark:bg-zinc-800 dark:text-zinc-300">
                    Role: {userProfile.role}
                  </span>
                </div>

                <div className="pt-1">
                  {userProfile.role === "admin" && (
                    <Link
                      href="/admin/analytics"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                    >
                      <span>Admin Dashboard</span>
                    </Link>
                  )}

                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

