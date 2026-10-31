"use client";

import * as React from "react";
import Link from "next/link";
import {
  MessageCircle,
  Heart,
  AtSign,
  Megaphone,
  Calendar,
  Sparkles,
} from "lucide-react";
import { AppNotification, NotificationType } from "@/types/database";

export interface NotificationItemProps {
  notification: AppNotification;
  onRead?: (id: string) => void;
}

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  post_comment: {
    label: "Comment",
    icon: MessageCircle,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
  },
  post_like: {
    label: "Reaction",
    icon: Heart,
    color: "bg-pink-100 text-pink-600 dark:bg-pink-950/60 dark:text-pink-400",
  },
  mention: {
    label: "Mention",
    icon: AtSign,
    color: "bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400",
  },
  newsletter_broadcast: {
    label: "Broadcast",
    icon: Megaphone,
    color: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
  },
  event_reminder: {
    label: "Event",
    icon: Calendar,
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
  },
  event_waitlist_promoted: {
    label: "Spot Open",
    icon: Sparkles,
    color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400",
  },
};

function formatRelativeTime(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));
  } catch {
    return "";
  }
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const isUnread = !notification.read_at;
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.post_comment;
  const IconComponent = config.icon;

  const handleClick = () => {
    if (isUnread && onRead) {
      onRead(notification.id);
    }
  };

  return (
    <Link
      href={notification.payload.url || "#"}
      onClick={handleClick}
      className={`group relative flex items-start gap-3 rounded-xl p-3 text-left transition ${
        isUnread
          ? "bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/40"
          : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
      }`}
    >
      {/* Icon badge or actor avatar */}
      <div className="relative shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
          {notification.actor?.full_name ? (
            notification.actor.full_name.slice(0, 2).toUpperCase()
          ) : (
            <IconComponent className="h-4 w-4" />
          )}
        </div>
        <span
          className={`absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-white text-[10px] shadow-xs dark:border-zinc-900 ${config.color}`}
        >
          <IconComponent className="h-2.5 w-2.5" />
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {notification.payload.title}
          </p>
          <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>

        {notification.payload.snippet && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
            {notification.payload.snippet}
          </p>
        )}
      </div>

      {/* Unread indicator dot */}
      {isUnread && (
        <span
          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600 ring-2 ring-white dark:ring-zinc-900"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

