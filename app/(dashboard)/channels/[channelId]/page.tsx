"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Hash, MoreVertical } from "lucide-react";
import { MobileDrawer } from "@/components/ui/MobileDrawer";
import { ChatWindow } from "@/components/community/ChatWindow";

export default function ChannelChatPage() {
  const params = useParams();
  const channelId = (params?.channelId as string) || "general";
  const [infoOpen, setInfoOpen] = React.useState(false);

  // In production, currentUser and tenantId are supplied from the active authenticated session
  const activeTenantId = "00000000-0000-0000-0000-000000000001";
  const currentUser = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Alex Carter",
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
      {/* Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          {/* Back button on mobile to return to channels list */}
          <Link
            href="/feed"
            aria-label="Back to channels"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-zinc-500" />
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {channelId}
            </h1>
          </div>
        </div>

        <button
          onClick={() => setInfoOpen(true)}
          aria-label="Channel Info"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </header>

      {/* Real-Time Chat Window with Redis & Supabase isolation */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          tenantId={activeTenantId}
          channelId={channelId}
          currentUser={currentUser}
        />
      </div>

      {/* Channel Details Drawer */}
      <MobileDrawer
        open={infoOpen}
        onOpenChange={setInfoOpen}
        title={`#${channelId}`}
        description="Channel information and details"
      >
        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Topic</span>
            <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
              Discussions and coordination for #{channelId}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Privacy</span>
            <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
              Public channel (Tenant-isolated)
            </p>
          </div>
        </div>
      </MobileDrawer>
    </div>
  );
}

