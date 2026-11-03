"use client";

import * as React from "react";
import { Heart, MessageCircle, Share2, Sparkles, Bookmark, Check, ZoomIn, X, HelpCircle, Megaphone } from "lucide-react";
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

const CATEGORY_STYLES: Record<PostCategory, { label: string; badgeClass: string; icon?: React.ReactNode }> = {
  announcement: {
    label: "Announcement",
    badgeClass: "bg-red-500/10 text-red-600 border border-red-500/20 dark:bg-red-950/60 dark:text-red-400 dark:border-red-900/50",
  },
  intern_spotlight: {
    label: "Intern Spotlight",
    badgeClass: "bg-gradient-to-r from-amber-500/15 to-yellow-500/15 text-amber-700 border border-amber-500/30 shadow-xs shadow-amber-500/10 dark:from-amber-950/70 dark:to-yellow-950/50 dark:text-amber-300 dark:border-amber-700/50",
  },
  general: {
    label: "General",
    badgeClass: "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/50",
  },
  qna: {
    label: "Q&A Discussion",
    badgeClass: "bg-gradient-to-r from-purple-500/15 to-indigo-500/15 text-purple-700 border border-purple-500/30 shadow-xs shadow-purple-500/10 dark:from-purple-950/70 dark:to-indigo-950/50 dark:text-purple-300 dark:border-purple-700/50",
  },
  event: {
    label: "Event Update",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/50",
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

  const [isBookmarked, setIsBookmarked] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [zoomedImage, setZoomedImage] = React.useState<string | null>(null);

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
          url: `${window.location.origin}/feed#post-${post.id}`,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/feed#post-${post.id}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleToggleBookmark = () => {
    setIsBookmarked((prev) => !prev);
  };

  const mediaList = post.media_urls || [];

  return (
    <>
      <article
        id={`post-${post.id}`}
        className={`rounded-2xl border bg-white p-4 transition shadow-xs dark:bg-zinc-950 ${
          post.category === "intern_spotlight"
            ? "border-amber-500/30 ring-1 ring-amber-500/10 dark:border-amber-700/40"
            : post.category === "qna"
              ? "border-purple-500/30 ring-1 ring-purple-500/10 dark:border-purple-700/40"
              : post.category === "announcement"
                ? "border-red-500/30 dark:border-red-800/40"
                : "border-zinc-200 dark:border-zinc-800"
        }`}
      >
        {/* Ribbon banner for special categories */}
        {post.category === "intern_spotlight" && (
          <div className="mb-3 -mt-1 -mx-1 flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Intern Spotlight Milestone</span>
          </div>
        )}

        {post.category === "qna" && (
          <div className="mb-3 -mt-1 -mx-1 flex items-center gap-1.5 rounded-xl bg-purple-500/10 px-3 py-1.5 text-[11px] font-semibold text-purple-600 dark:bg-purple-950/40 dark:text-purple-300">
            <HelpCircle className="h-3.5 w-3.5 text-purple-500" />
            <span>Community Question & Answer</span>
          </div>
        )}

        {post.category === "announcement" && (
          <div className="mb-3 -mt-1 -mx-1 flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <Megaphone className="h-3.5 w-3.5 text-red-500" />
            <span>Official Organization Announcement</span>
          </div>
        )}

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

        {/* Media Grid: Responsive handling 1, 2, 3, or 4+ images with zoom */}
        {mediaList.length > 0 && (
          <div
            className={`mt-3 grid gap-2 overflow-hidden rounded-xl ${
              mediaList.length === 1
                ? "grid-cols-1"
                : mediaList.length === 2
                  ? "grid-cols-2"
                  : mediaList.length === 3
                    ? "grid-cols-3"
                    : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            {mediaList.map((url, idx) => (
              <div
                key={url}
                onClick={() => setZoomedImage(url)}
                className={`group relative cursor-pointer overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900 ${
                  mediaList.length === 1 ? "max-h-96" : "aspect-square"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Attachment ${idx + 1}`}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <ZoomIn className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Action Bar: Like, Comment, Share, Bookmark with 44px min touch targets */}
        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800/80">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={handleToggleLike}
              disabled={isLiking}
              aria-label="Like post"
              className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition"
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
              className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.comments_count}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleShare}
              aria-label="Share post"
              className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>

            <button
              onClick={handleToggleBookmark}
              aria-label="Bookmark post"
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-xs font-medium transition ${
                isBookmarked
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-blue-500 text-blue-500" : ""}`} />
            </button>
          </div>
        </div>
      </article>

      {/* Lightbox Zoom Modal */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close zoomed view"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomedImage}
            alt="Zoomed attachment"
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

