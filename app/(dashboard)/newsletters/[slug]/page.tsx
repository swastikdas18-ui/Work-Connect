"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, Users, Calendar, Loader2, Sparkles, Share2, Check, Bookmark, CalendarDays } from "lucide-react";
import { Newsletter } from "@/types/database";

function NewsletterReaderContent() {
  const params = useParams();
  const slug = params?.slug as string;
  const [newsletter, setNewsletter] = React.useState<Newsletter | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [bookmarked, setBookmarked] = React.useState(false);

  const tenantId = "00000000-0000-0000-0000-000000000001";

  React.useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/newsletters/${slug}`, {
          headers: { "x-tenant-id": tenantId },
        });
        if (res.ok) {
          const data = await res.json();
          setNewsletter(data.newsletter);
        }
      } finally {
        setIsLoading(false);
      }
    }
    if (slug) {
      void load();
    }
  }, [slug, tenantId]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Newsletter Not Found
        </h2>
        <Link
          href="/newsletters"
          className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
        >
          Return to Newsletters
        </Link>
      </div>
    );
  }

  const wordCount = newsletter.content_html
    ? newsletter.content_html.replace(/<[^>]+>/g, "").split(/\s+/).length
    : 100;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <article className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      {/* Back button & Action controls */}
      <div className="flex items-center justify-between">
        <Link
          href="/newsletters"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Digests</span>
        </Link>

        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            aria-label="Share article"
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </>
            )}
          </button>

          <button
            onClick={() => setBookmarked((prev) => !prev)}
            aria-label="Bookmark edition"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-zinc-200 bg-white p-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-blue-500 text-blue-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="mt-6 border-b border-zinc-200 pb-8 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-400/10 dark:text-blue-300 uppercase tracking-wide">
            <Sparkles className="h-3 w-3" />
            {newsletter.target_audience.replace("_", " ")}
          </span>
          <span className="rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
            {newsletter.status}
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          {newsletter.title}
        </h1>

        {newsletter.summary && (
          <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400 border-l-2 border-blue-500 pl-4 italic">
            {newsletter.summary}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
            <Users className="h-3.5 w-3.5 text-blue-500" />
            <span>Work-Connect Editorial</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {newsletter.published_at
                ? new Date(newsletter.published_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                : new Date(newsletter.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{readTimeMin} min read</span>
          </div>
        </div>
      </div>

      {/* Reader Prose Content */}
      <div
        className="prose prose-zinc dark:prose-invert mt-8 max-w-none text-zinc-800 leading-relaxed dark:text-zinc-200"
        dangerouslySetInnerHTML={{ __html: newsletter.content_html }}
      />

      {/* Discussion & Next Event Quick Link */}
      <div className="mt-12 rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-6 dark:border-zinc-800 dark:from-zinc-900/60 dark:to-zinc-900">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          <span>Related Community Events</span>
        </div>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Check out the events agenda to RSVP for the discussions and demo days mentioned in this dispatch.
        </p>
        <Link
          href="/events"
          className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-500"
        >
          <span>View Upcoming Events</span>
        </Link>
      </div>
    </article>
  );
}

export default function NewsletterReaderPage() {
  return (
    <div className="flex h-full flex-col bg-white overflow-y-auto dark:bg-zinc-950">
      <Suspense fallback={<div className="h-96 w-full animate-pulse bg-zinc-100 dark:bg-zinc-900" />}>
        <NewsletterReaderContent />
      </Suspense>
    </div>
  );
}
