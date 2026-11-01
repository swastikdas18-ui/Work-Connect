"use client";

import * as React from "react";
import { Suspense } from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { MobileDrawer } from "@/components/ui/MobileDrawer";
import { ChannelList } from "@/components/community/ChannelList";
import { BroadcastBanner } from "@/components/community/BroadcastBanner";
import { NotificationCenter } from "@/components/community/NotificationCenter";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const currentUserId = "00000000-0000-0000-0000-000000000001";

  return (
    <div className="flex min-h-dvh flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Real-Time Company Broadcast Banner */}
      <BroadcastBanner tenantId={tenantId} />

      {/* Top Header Shell */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800 md:px-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Work-Connect
          </span>
          <span className="hidden rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 sm:inline">
            Enterprise Portal
          </span>
        </div>

        {/* Global Notification Bell Trigger */}
        <div className="flex items-center gap-2">
          <NotificationCenter tenantId={tenantId} userId={currentUserId} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Side Navigation Drawer for Channels (hidden on mobile, fixed width on md+) */}
        <aside className="hidden w-72 shrink-0 border-r border-zinc-200 dark:border-zinc-800 md:flex md:flex-col">
          <Suspense fallback={<div className="h-full w-full animate-pulse bg-zinc-100 dark:bg-zinc-900" />}>
            <ChannelList onOpenSettings={() => setDrawerOpen(true)} />
          </Suspense>
        </aside>

        {/* Main Content Area: Dynamic Viewport & Responsive */}
        <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
          <Suspense fallback={<div className="h-full w-full animate-pulse bg-zinc-50 dark:bg-zinc-900" />}>
            {children}
          </Suspense>
        </main>
      </div>

      {/* Mobile Drawer Sheet for Settings / Switcher */}
      <MobileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Workspace Settings"
        description="Manage your tenant workspace preferences and notifications."
      >
        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Active Tenant
            </h4>
            <p className="mt-1 text-xs text-zinc-500">
              Work-Connect Primary Workspace (Multi-Tenant Isolation Active)
            </p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </MobileDrawer>

      {/* Fixed Mobile Bottom Navigation Bar (hidden on md+) */}
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
