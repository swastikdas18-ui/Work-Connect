"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Shield, Building, LogOut, CheckCircle2, RefreshCw } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/db/browser";
import { useStoredUser, useIsMounted } from "@/lib/hooks/useMounted";

export default function ProfilePage() {
  const router = useRouter();
  const mounted = useIsMounted();
  const storedUser = useStoredUser();
  const [activeUser, setActiveUser] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);

  const user = activeUser || (mounted ? storedUser : {
    name: "Alex Carter",
    email: "alex.carter@workconnect.internal",
    role: "intern",
  });

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

  const switchPersona = (persona: "intern" | "mentor" | "admin") => {
    let updated;
    if (persona === "mentor") {
      updated = {
        name: "Sarah Chen",
        email: "sarah.chen@techcorp.internal",
        role: "mentor",
      };
    } else if (persona === "admin") {
      updated = {
        name: "Admin Operator",
        email: "admin@workconnect.internal",
        role: "admin",
      };
    } else {
      updated = {
        name: "Alex Carter",
        email: "alex.carter@workconnect.internal",
        role: "intern",
      };
    }
    setActiveUser(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("work_connect_user", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
      document.cookie = `work_connect_user_role=${updated.role}; path=/; max-age=86400`;
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* User Header Profile Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-blue-500/40 bg-blue-600/20 text-xl font-bold text-blue-500 dark:text-blue-400">
            {mounted
              ? user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
              : "AC"}
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {mounted ? user.name : "Alex Carter"}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {mounted ? user.email : "alex.carter@workconnect.internal"}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">
                <Shield className="h-3 w-3" />
                {mounted ? user.role : "intern"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Switch Persona for Fast Testing */}
      <div className="rounded-2xl border border-zinc-200 bg-white/40 p-6 space-y-3 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <RefreshCw className="h-3.5 w-3.5" />
          Test Persona Switcher
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Switch active role locally to verify role-based gating and permission views.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => switchPersona("intern")}
            className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              user.role === "intern"
                ? "bg-blue-600 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            Demo Intern (Alex)
          </button>
          <button
            type="button"
            onClick={() => switchPersona("mentor")}
            className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              user.role === "mentor"
                ? "bg-blue-600 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            Demo Mentor (Sarah)
          </button>
          <button
            type="button"
            onClick={() => switchPersona("admin")}
            className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              user.role === "admin"
                ? "bg-blue-600 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            Demo Admin
          </button>
        </div>
      </div>

      {/* Workspace Details */}
      <div className="rounded-2xl border border-zinc-200 bg-white/40 p-6 space-y-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Workspace Details
        </h2>
        <div className="flex items-center justify-between border-b border-zinc-100 py-2.5 text-sm dark:border-zinc-800/60">
          <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <Building className="h-4 w-4" /> Organization
          </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-200">
            Work-Connect Community
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5 text-sm">
          <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <User className="h-4 w-4" /> Tenant UUID
          </span>
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            00000000-0000-0000-0000-000000000001
          </span>
        </div>
      </div>

      {/* Sign Out Button */}
      <button
        type="button"
        onClick={handleSignOut}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-400"
      >
        <LogOut className="h-4 w-4" />
        <span>Sign Out</span>
      </button>
    </div>
  );
}
