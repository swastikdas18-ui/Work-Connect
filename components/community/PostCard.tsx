"use client";

import * as React from "react";
import { Heart, MessageCircle, Share2, Sparkles } from "lucide-react";
import { Post, PostCategory } from "@/types/database";

interface PostCardProps {
  post: Post & {
    author?: {
      id: string;
      full_name: string;
      avatar_url: string | null;
      role: string;
    } | null;
    hasLiked?: boolean;
  };
  tenantId: string;
  currentUserId: string;
  onOpenComments?: (post: Post) => void;
}

const CATEGORY_STYLES: Record<PostCategory, { label: string; badgeClass: string }> = {
  announcement: {
    label: "Announcement",
    badgeClass: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  },
  intern_spotlight: {
    label: "Intern Spotlight",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  },
  general: {
    label: "General",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  },
  qna: {
    label: "Q&A",
    badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  },
  event: {
    label: "Event",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
};

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

export function PostCard({ post, tenantId, currentUserId, onOpenComments }: PostCardProps) {
  const [hasLiked, setHasLiked] = React.useState(Boolean(post.hasLiked));
  const [likesCount, setLikesCount] = React.useState(post.likes_count);
  const [isLiking, setIsLiking] = React.useState(false);

  const authorName = post.author?.full_name || "Community Member";
  const authorRole = post.author?.role === "owner" || post.author?.role === "admin" ? "Employee" : "Intern";
  const authorInitials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const categoryConfig = CATEGORY_STYLES[post.category] || CATEGORY_STYLES.general;

  const handleToggleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const prevLiked = hasLiked;
    const prevCount = likesCount;

    // Optimistic toggle
    setHasLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(prevCount - 1, 0) : prevCount + 1);

    try {
      const res = await fetch(`/api/posts/${post.id}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({ userId: currentUserId }),
      });

      if (!res.ok) {
        throw new Error("Reaction failed");
      }

      const data = await res.json();
      if (typeof data.likesCount === "number") {
        setLikesCount(data.likesCount);
        setHasLiked(Boolean(data.liked));
      }
    } catch {
      // Revert optimistic state
      setHasLiked(prevLiked);
      setLikesCount(prevCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${authorName}`,
          text: post.content,
          url: window.location.href,
        });
      } catch {
        // Ignored if user cancels share dialog
      }
    }
  };

  const mediaList = post.media_urls || [];

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 transition shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header: Author Metadata & Category */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {post.author?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.author.avatar_url}
                alt={authorName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              authorInitials
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {authorName}
              </h3>
              <span className="flex items-center gap-0.5 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {authorRole === "Intern" && <Sparkles className="h-2.5 w-2.5 text-amber-500" />}
                {authorRole}
              </span>
            </div>
            <p className="text-xs text-zinc-400">{formatRelativeTime(post.created_at)}</p>
          </div>
        </div>

        {/* Category Pill */}
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryConfig.badgeClass}`}
        >
          {categoryConfig.label}
        </span>
      </div>

      {/* Post Text Body */}
      <div className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
        {post.content}
      </div>

      {/* Media Grid: Responsive handling 1, 2, 3, or 4+ images */}
      {mediaList.length > 0 && (
        <div
          className={`mt-3 grid gap-1.5 overflow-hidden rounded-xl ${
            mediaList.length === 1
              ? "grid-cols-1"
              : mediaList.length === 2
                ? "grid-cols-2"
                : mediaList.length === 3
                  ? "grid-cols-3"
                  : "grid-cols-2"
          }`}
        >
          {mediaList.map((url, idx) => (
            <div
              key={url}
              className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 ${
                mediaList.length === 1 ? "max-h-96" : "aspect-square"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Media attachment ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Bottom Action Bar: Like, Comment, Share with 44px min touch targets */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800/80">
        <button
          onClick={handleToggleLike}
          disabled={isLiking}
          aria-label="Like post"
          className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              hasLiked ? "fill-red-500 text-red-500" : ""
            }`}
          />
          <span>{likesCount}</span>
        </button>

        <button
          onClick={() => onOpenComments?.(post)}
          aria-label="Comments"
          className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{post.comments_count}</span>
        </button>

        <button
          onClick={handleShare}
          aria-label="Share post"
          className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>
    </article>
  );
}

