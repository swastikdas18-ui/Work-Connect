"use client";

import { PresenceStatus } from "@/types/database";

interface PresenceAvatarProps {
  name: string;
  avatarUrl?: string | null;
  status?: PresenceStatus;
  size?: "sm" | "md" | "lg";
}

const STATUS_COLOR: Record<PresenceStatus, string> = {
  online: "bg-emerald-500 ring-white dark:ring-zinc-950",
  busy: "bg-red-500 ring-white dark:ring-zinc-950",
  away: "bg-amber-500 ring-white dark:ring-zinc-950",
  offline: "bg-zinc-400 ring-white dark:ring-zinc-950",
};

const SIZE_CONFIG = {
  sm: { container: "h-8 w-8 text-xs", dot: "h-2 w-2" },
  md: { container: "h-10 w-10 text-xs", dot: "h-2.5 w-2.5" },
  lg: { container: "h-12 w-12 text-sm", dot: "h-3 w-3" },
};

export function PresenceAvatar({
  name,
  avatarUrl,
  status = "offline",
  size = "md",
}: PresenceAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const cfg = SIZE_CONFIG[size];

  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ${cfg.container}`}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}

      {/* Colored Status Dot */}
      <span
        aria-label={`Status: ${status}`}
        className={`absolute bottom-0 right-0 rounded-full ring-2 ${STATUS_COLOR[status]} ${cfg.dot}`}
      />
    </div>
  );
}

