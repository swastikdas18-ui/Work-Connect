"use client";

import * as React from "react";
import { Drawer } from "vaul";
import {
  Bell,
  CheckCheck,
  Loader2,
  Inbox,
  AlertCircle,
  X,
} from "lucide-react";
import { AppNotification } from "@/types/database";
import { NotificationItem } from "./NotificationItem";
import { createBrowserSupabaseClient } from "@/lib/db/browser";

export interface NotificationCenterProps {
  tenantId: string;
  userId: string;
}

export function NotificationCenter({ tenantId, userId }: NotificationCenterProps) {
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isMarkingAll, setIsMarkingAll] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fetchNotifications = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/notifications?limit=30", {
        headers: {
          "x-tenant-id": tenantId,
          "x-user-id": userId,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load notifications");
      }

      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading notifications";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, userId]);

  // Initial fetch on mount
  React.useEffect(() => {
    let ignore = false;
    async function load() {
      if (!ignore) {
        await fetchNotifications();
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [fetchNotifications]);

  // Real-time Supabase subscription scoped strictly by tenant_id & recipient_id
  React.useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channelName = `tenant:${tenantId}:user:${userId}:notifications`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          if (newNotif.recipient_id === userId) {
            setNotifications((prev) => [newNotif, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, userId]);

  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !n.read_at).length;
  }, [notifications]);

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );

    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          "x-tenant-id": tenantId,
          "x-user-id": userId,
        },
      });
    } catch {
      // Revert if necessary
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);

    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "x-tenant-id": tenantId,
          "x-user-id": userId,
        },
      });
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void fetchNotifications();
        }}
        className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Drawer Container (Responsive mobile bottom sheet & desktop modal) */}
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[85dvh] flex-col rounded-t-[20px] border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 outline-none md:inset-auto md:top-16 md:right-6 md:w-full md:max-w-md md:rounded-2xl md:border shadow-2xl">
            {/* Mobile drag handle */}
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700 md:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 p-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Drawer.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Notifications
                </Drawer.Title>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={isMarkingAll}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 transition"
                  >
                    {isMarkingAll ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="h-3.5 w-3.5" />
                    )}
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notifications List Body */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {errorMessage && (
                <div className="m-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {isLoading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <p className="mt-2 text-xs">Loading updates...</p>
                </div>
              )}

              {!isLoading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                    <Inbox className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    All caught up!
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Mentions, comments, event alerts, and broadcasts will appear here.
                  </p>
                </div>
              )}

              {notifications.map((notification) => (
                <div key={notification.id} onClick={() => setOpen(false)}>
                  <NotificationItem
                    notification={notification}
                    onRead={handleMarkAsRead}
                  />
                </div>
              ))}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

