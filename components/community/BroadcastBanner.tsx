"use client";

import * as React from "react";
import Link from "next/link";
import { Radio, X, ArrowRight } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/db/browser";

interface BroadcastNotification {
  newsletterId: string;
  title: string;
  slug: string;
  summary: string | null;
}

interface BroadcastBannerProps {
  tenantId: string;
}

export function BroadcastBanner({ tenantId }: BroadcastBannerProps) {
  const [broadcast, setBroadcast] = React.useState<BroadcastNotification | null>(null);
  const [isDismissed, setIsDismissed] = React.useState(false);

  React.useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channelName = `tenant:${tenantId}:channel:notifications`;

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "newsletter_broadcast" }, (payload) => {
        if (payload?.payload?.title && payload?.payload?.slug) {
          setBroadcast({
            newsletterId: payload.payload.newsletterId,
            title: payload.payload.title,
            slug: payload.payload.slug,
            summary: payload.payload.summary,
          });
          setIsDismissed(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  if (!broadcast || isDismissed) {
    return null;
  }

  return (
    <aside
      aria-label="New broadcast alert"
      className="sticky top-0 z-40 flex items-center justify-between border-b border-blue-200 bg-blue-600 px-4 py-2.5 text-white shadow-md dark:border-blue-900"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <Radio className="h-4 w-4 shrink-0 animate-pulse text-amber-300" />
        <span className="rounded bg-blue-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-100">
          Company Digest
        </span>
        <span className="truncate text-xs font-medium">{broadcast.title}</span>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/newsletters/${broadcast.slug}`}
          onClick={() => setIsDismissed(true)}
          className="flex min-h-[32px] items-center gap-1 rounded-lg bg-white/20 px-2.5 text-xs font-semibold text-white hover:bg-white/30"
        >
          <span>Read Now</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
        <button
          onClick={() => setIsDismissed(true)}
          aria-label="Dismiss banner"
          className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-blue-100 hover:bg-blue-700 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

