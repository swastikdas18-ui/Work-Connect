"use client";

import * as React from "react";
import Link from "next/link";
import { Newspaper, Plus, Loader2, Clock, Calendar, ArrowRight, Sparkles, BookOpen } from "lucide-react";
import { Newsletter, UserRole } from "@/types/database";
import { NewsletterCard } from "@/components/community/NewsletterCard";
import { NewsletterEditor } from "@/components/community/NewsletterEditor";
import { MobileDrawer } from "@/components/ui/MobileDrawer";

export default function NewslettersPage() {
  const [newsletters, setNewsletters] = React.useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editorOpen, setEditorOpen] = React.useState(false);

  // In production, retrieved from active authenticated session
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const currentUserId = "00000000-0000-0000-0000-000000000001";
  const currentUserRole: UserRole = "admin";

  const isPrivileged = currentUserRole === "admin" || currentUserRole === "owner" || currentUserRole === "moderator";

  const fetchNewsletters = React.useCallback(async () => {
    try {
      const res = await fetch("/api/newsletters", {
        headers: {
          "x-tenant-id": tenantId,
          "x-user-id": currentUserId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNewsletters(data.newsletters || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, currentUserId]);

  React.useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/newsletters", {
          headers: {
            "x-tenant-id": tenantId,
            "x-user-id": currentUserId,
          },
        });
        if (!ignore && res.ok) {
          const data = await res.json();
          setNewsletters(data.newsletters || []);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [tenantId, currentUserId]);

  const latestNewsletter = newsletters.length > 0 ? newsletters[0] : null;
  const archivedNewsletters = newsletters.length > 1 ? newsletters.slice(1) : [];

  return (
    <div className="flex h-full flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Editorial Newsletter Hub
            </h1>
          </div>
        </div>

        {isPrivileged && (
          <button
            onClick={() => setEditorOpen(true)}
            aria-label="New Edition"
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white transition hover:bg-blue-500 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Edition</span>
          </button>
        )}
      </header>

      {/* Editorial Newsletter Hub Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : newsletters.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
              <Newspaper className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
              <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                No newsletters published yet
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Weekly digests, intern spotlights, and company updates will be featured here.
              </p>
            </div>
          ) : (
            <>
              {/* Featured Latest Digest Hero Card */}
              {latestNewsletter && (
                <div className="group relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 p-6 shadow-sm transition hover:shadow-md dark:border-blue-500/20 dark:from-zinc-900/90 dark:via-zinc-900 dark:to-blue-950/30 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20">
                      <Sparkles className="h-3 w-3" />
                      Latest Weekly Dispatch
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <Clock className="h-3.5 w-3.5" />
                      4 min read
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(latestNewsletter.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                    {latestNewsletter.title}
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-base line-clamp-3">
                    {latestNewsletter.summary ||
                      latestNewsletter.content_html.replace(/<[^>]+>/g, "").slice(0, 240) + "..."}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200/60 pt-4 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
                        ED
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Editorial Team
                        </p>
                        <p className="text-[11px] text-zinc-400">Work-Connect Community</p>
                      </div>
                    </div>

                    <Link
                      href={`/newsletters/${latestNewsletter.id}`}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 active:scale-98 shadow-sm"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Read Edition</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Newsletter Archive Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Archive &amp; Previous Editions ({newsletters.length})
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {(archivedNewsletters.length > 0 ? archivedNewsletters : [latestNewsletter]).map(
                    (item) =>
                      item && (
                        <NewsletterCard
                          key={item.id}
                          newsletter={item}
                          tenantId={tenantId}
                          isAdmin={isPrivileged}
                          onBroadcastSuccess={fetchNewsletters}
                        />
                      )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compose Newsletter Drawer / Modal */}
      <MobileDrawer
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title="Compose Newsletter Edition"
        description="Write and publish an update or company digest."
      >
        <NewsletterEditor
          tenantId={tenantId}
          currentUserId={currentUserId}
          onSuccess={() => {
            setEditorOpen(false);
            fetchNewsletters();
          }}
        />
      </MobileDrawer>
    </div>
  );
}
