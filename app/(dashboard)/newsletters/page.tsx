"use client";

import * as React from "react";
import { Newspaper, Plus, Loader2 } from "lucide-react";
import { Newsletter, UserRole } from "@/types/database";
import { NewsletterCard } from "@/components/community/NewsletterCard";
import { NewsletterEditor } from "@/components/community/NewsletterEditor";
import { MobileDrawer } from "@/components/ui/MobileDrawer";

export default function NewslettersPage() {
  const [newsletters, setNewsletters] = React.useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editorOpen, setEditorOpen] = React.useState(false);

  // In production, retrieved from active authenticated session
  const tenantId = "tenant-default";
  const currentUserId = "user-1";
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

  return (
    <div className="flex h-full flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Company Digest &amp; Newsletters
            </h1>
          </div>
        </div>

        {isPrivileged && (
          <button
            onClick={() => setEditorOpen(true)}
            aria-label="New Edition"
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>New Edition</span>
          </button>
        )}
      </header>

      {/* Newsletter Editions Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-4">
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
                Weekly digests and company updates will be featured here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {newsletters.map((newsletter) => (
                <NewsletterCard
                  key={newsletter.id}
                  newsletter={newsletter}
                  tenantId={tenantId}
                  isAdmin={isPrivileged}
                  onBroadcastSuccess={fetchNewsletters}
                />
              ))}
            </div>
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

