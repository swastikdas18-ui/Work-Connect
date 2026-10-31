"use client";

import * as React from "react";
import { Send, Eye, Edit3, Calendar, Loader2 } from "lucide-react";
import { NewsletterAudience, NewsletterStatus } from "@/types/database";

interface NewsletterEditorProps {
  tenantId: string;
  currentUserId: string;
  onSuccess?: () => void;
}

const AUDIENCE_OPTIONS: { label: string; value: NewsletterAudience }[] = [
  { label: "All Workspace", value: "all" },
  { label: "Employees Only", value: "employees_only" },
  { label: "Interns Only", value: "interns_only" },
];

export function NewsletterEditor({ tenantId, currentUserId, onSuccess }: NewsletterEditorProps) {
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [contentHtml, setContentHtml] = React.useState("");
  const [targetAudience, setTargetAudience] = React.useState<NewsletterAudience>("all");
  const [activeTab, setActiveTab] = React.useState<"edit" | "preview">("edit");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (status: NewsletterStatus) => {
    if (!title.trim() || !contentHtml.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/newsletters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
          "x-user-id": currentUserId,
        },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim() || null,
          contentHtml,
          targetAudience,
          status,
        }),
      });

      if (res.ok) {
        setTitle("");
        setSummary("");
        setContentHtml("");
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Compose Edition
        </h2>

        {/* Edit / Preview Segmented Control */}
        <div className="flex items-center rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`flex min-h-[32px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
              activeTab === "edit"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex min-h-[32px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
              activeTab === "preview"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Mobile Preview</span>
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q4 Highlights & Intern Spotlight Digest"
            className="mt-1 flex h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>

        {/* Summary */}
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase">
            Summary / Preview Hook
          </label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief 1-2 sentence overview for push notifications & email subjects"
            className="mt-1 flex h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>

        {/* Target Audience Segmented Control */}
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase">
            Target Audience
          </label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {AUDIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTargetAudience(opt.value)}
                className={`flex min-h-[36px] items-center rounded-xl px-3.5 text-xs font-semibold transition ${
                  targetAudience === opt.value
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body Editor or Preview Tab */}
        {activeTab === "edit" ? (
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase">
              Newsletter HTML / Markdown Content
            </label>
            <textarea
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
              placeholder="<h2>Welcome to this week's edition!</h2><p>Share company updates, project milestones, and shoutouts...</p>"
              rows={8}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 font-mono text-xs outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {title || "Untitled Edition"}
            </h1>
            {summary && <p className="mt-1 text-xs text-zinc-500 italic">{summary}</p>}
            <div
              className="prose prose-sm dark:prose-invert mt-4 max-w-none text-zinc-800 dark:text-zinc-200"
              dangerouslySetInnerHTML={{
                __html: contentHtml || "<p className='text-zinc-400'>No content preview available yet.</p>",
              }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={isSubmitting || !title.trim()}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 disabled:opacity-40"
          >
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit("scheduled")}
            disabled={isSubmitting || !title.trim()}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 disabled:opacity-40"
          >
            <Calendar className="h-4 w-4" />
            <span>Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit("published")}
            disabled={isSubmitting || !title.trim() || !contentHtml.trim()}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-40"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Publish Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

