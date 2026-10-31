"use client";

import Link from "next/link";
import { Clock, BookOpen, Users, Radio, Loader2 } from "lucide-react";
import { Newsletter } from "@/types/database";
import * as React from "react";

interface NewsletterCardProps {
  newsletter: Newsletter & {
    author?: {
      id: string;
      full_name: string;
      avatar_url: string | null;
      role: string;
    } | null;
  };
  tenantId: string;
  isAdmin?: boolean;
  onBroadcastSuccess?: () => void;
}

const AUDIENCE_BADGE: Record<string, { label: string; badge: string }> = {
  all: { label: "All Workspace", badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" },
  employees_only: { label: "Employees Only", badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" },
  interns_only: { label: "Interns Only", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" },
};

export function NewsletterCard({ newsletter, tenantId, isAdmin, onBroadcastSuccess }: NewsletterCardProps) {
  const [isBroadcasting, setIsBroadcasting] = React.useState(false);
  const authorName = newsletter.author?.full_name || "Editorial Team";
  const audience = AUDIENCE_BADGE[newsletter.target_audience] || AUDIENCE_BADGE.all;

  // Approximate read time based on word count
  const wordCount = newsletter.content_html ? newsletter.content_html.replace(/<[^>]+>/g, "").split(/\s+/).length : 100;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const handleBroadcast = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isBroadcasting) return;

    setIsBroadcasting(true);
    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}/broadcast`, {
        method: "POST",
        headers: {
          "x-tenant-id": tenantId,
        },
      });
      if (res.ok) {
        onBroadcastSuccess?.();
      }
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
      <div>
        {/* Audience Pill & Status */}
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${audience.badge}`}>
            {audience.label}
          </span>

          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              newsletter.status === "published"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-400"
            }`}
          >
            {newsletter.status}
          </span>
        </div>

        {/* Title */}
        <Link href={`/newsletters/${newsletter.slug}`} className="mt-3 block">
          <h2 className="text-base font-bold text-zinc-900 group-hover:text-blue-600 transition dark:text-zinc-50 dark:group-hover:text-blue-400">
            {newsletter.title}
          </h2>
        </Link>

        {/* Summary preview */}
        {newsletter.summary && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {newsletter.summary}
          </p>
        )}
      </div>

      {/* Meta Footer */}
      <div className="mt-5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="truncate max-w-[120px]">{authorName}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{readTimeMin} min read</span>
            </span>

            {/* Admin Broadcast Trigger */}
            {isAdmin && (
              <button
                onClick={handleBroadcast}
                disabled={isBroadcasting}
                aria-label="Broadcast now"
                className="flex min-h-[36px] items-center gap-1 rounded-lg bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300"
              >
                {isBroadcasting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Radio className="h-3.5 w-3.5" />
                    <span>Broadcast</span>
                  </>
                )}
              </button>
            )}

            <Link
              href={`/newsletters/${newsletter.slug}`}
              className="flex min-h-[36px] items-center gap-1 font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Read</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

