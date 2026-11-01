"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Hash, Lock, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelItem {
  id: string;
  name: string;
  type: "public" | "private";
  unreadCount?: number;
}

const mockChannels: ChannelItem[] = [
  { id: "general", name: "general", type: "public", unreadCount: 0 },
  { id: "announcements", name: "announcements", type: "public", unreadCount: 2 },
  { id: "dev-team", name: "dev-team", type: "private", unreadCount: 0 },
  { id: "random", name: "random", type: "public", unreadCount: 5 },
];

interface ChannelListProps {
  onSelectChannel?: (id: string) => void;
  onOpenSettings?: () => void;
}

export function ChannelList({ onSelectChannel, onOpenSettings }: ChannelListProps) {
  const params = useParams();
  const pathname = usePathname();
  const currentChannelId = (params?.channelId as string) || (pathname.includes("/channels/") ? pathname.split("/channels/")[1] : "general");

  return (
    <div className="flex h-full w-full flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Workspace Header */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            W
          </div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            Work-Connect
          </span>
        </div>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            aria-label="Channel Settings"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Channel Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 flex items-center justify-between px-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
          <span>Channels</span>
          <button
            aria-label="Add channel"
            className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1">
          {mockChannels.map((channel) => {
            const isActive = currentChannelId === channel.id;
            const Icon = channel.type === "public" ? Hash : Lock;

            return (
              <Link
                key={channel.id}
                href={`/channels/${channel.id}`}
                onClick={() => onSelectChannel?.(channel.id)}
                className={cn(
                  "flex min-h-[44px] items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                    : "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-900"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
                  <span className="truncate">{channel.name}</span>
                </div>
                {channel.unreadCount ? (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                    {channel.unreadCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

