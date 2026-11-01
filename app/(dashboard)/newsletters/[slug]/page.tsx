"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, Users, Calendar, Loader2 } from "lucide-react";
import { Newsletter } from "@/types/database";

function NewsletterReaderContent() {
  const params = useParams();
  const slug = params?.slug as string;
  const [newsletter, setNewsletter] = React.useState<Newsletter | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

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
    <article className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      {/* Back button */}
      <Link
        href="/newsletters"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Digests</span>
      </Link>

      {/* Header */}
      <div className="mt-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            {newsletter.target_audience.replace("_", " ")}
          </span>
          <span className="text-xs text-zinc-400">
            {newsletter.status}
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {newsletter.title}
        </h1>

        {newsletter.summary && (
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 italic dark:text-zinc-400">
            {newsletter.summary}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>Company Editorial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {newsletter.published_at
                ? new Date(newsletter.published_at).toLocaleDateString()
                : new Date(newsletter.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{readTimeMin} min read</span>
          </div>
        </div>
      </div>

      {/* Reader Prose Content */}
      <div
        className="prose prose-zinc dark:prose-invert mt-6 max-w-none text-zinc-800 leading-relaxed dark:text-zinc-200"
        dangerouslySetInnerHTML={{ __html: newsletter.content_html }}
      />
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

