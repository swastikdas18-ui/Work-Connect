"use client";

import * as React from "react";
import { Plus, Loader2 } from "lucide-react";
import { Post, PostComment } from "@/types/database";
import { PostCard } from "./PostCard";
import { PostComposerModal } from "./PostComposerModal";
import { MobileDrawer } from "@/components/ui/MobileDrawer";

interface PostFeedProps {
  tenantId: string;
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

const CATEGORY_TABS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Announcements", value: "announcement" },
  { label: "Intern Spotlight", value: "intern_spotlight" },
  { label: "General", value: "general" },
  { label: "Q&A", value: "qna" },
  { label: "Events", value: "event" },
];

export function PostFeed({ tenantId, currentUser }: PostFeedProps) {
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [posts, setPosts] = React.useState<
    (Post & {
      author?: { id: string; full_name: string; avatar_url: string | null; role: string } | null;
      hasLiked?: boolean;
    })[]
  >([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);

  // Comments Sheet State
  const [selectedPost, setSelectedPost] = React.useState<Post | null>(null);
  const [comments, setComments] = React.useState<
    (PostComment & {
      author?: { id: string; full_name: string; avatar_url: string | null; role: string } | null;
    })[]
  >([]);
  const [newCommentText, setNewCommentText] = React.useState("");
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);

  // Fetch initial posts for the active category
  const fetchPosts = React.useCallback(
    async (cat: string) => {
      try {
        const queryParams = new URLSearchParams({
          limit: "15",
          userId: currentUser.id,
        });
        if (cat !== "all") queryParams.set("category", cat);

        const res = await fetch(`/api/posts?${queryParams.toString()}`, {
          headers: { "x-tenant-id": tenantId },
        });

        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts || []);
          setCursor(data.nextCursor);
          setHasMore(Boolean(data.nextCursor));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [tenantId, currentUser.id]
  );

  React.useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        limit: "15",
        userId: currentUser.id,
      });
      if (activeCategory !== "all") queryParams.set("category", activeCategory);

      try {
        const res = await fetch(`/api/posts?${queryParams.toString()}`, {
          headers: { "x-tenant-id": tenantId },
        });

        if (!ignore && res.ok) {
          const data = await res.json();
          setPosts(data.posts || []);
          setCursor(data.nextCursor);
          setHasMore(Boolean(data.nextCursor));
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [activeCategory, tenantId, currentUser.id]);

  // Load next page via timestamp cursor pagination
  const loadMore = async () => {
    if (!cursor || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const queryParams = new URLSearchParams({
        limit: "15",
        cursor,
        userId: currentUser.id,
      });
      if (activeCategory !== "all") queryParams.set("category", activeCategory);

      const res = await fetch(`/api/posts?${queryParams.toString()}`, {
        headers: { "x-tenant-id": tenantId },
      });

      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => [...prev, ...(data.posts || [])]);
        setCursor(data.nextCursor);
        setHasMore(Boolean(data.nextCursor));
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Open comments sheet and fetch comments for post
  const handleOpenComments = async (post: Post) => {
    setSelectedPost(post);
    setComments([]);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        headers: { "x-tenant-id": tenantId },
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {
      // Ignored
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !newCommentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const commentBody = newCommentText.trim();
    setNewCommentText("");

    try {
      const res = await fetch(`/api/posts/${selectedPost.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          content: commentBody,
          authorId: currentUser.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          const fullComment = {
            ...data.comment,
            author: {
              id: currentUser.id,
              full_name: currentUser.name,
              avatar_url: null,
              role: currentUser.role,
            },
          };
          setComments((prev) => [...prev, fullComment]);
          // Update comment count on post in feed
          setPosts((prev) =>
            prev.map((p) =>
              p.id === selectedPost.id ? { ...p, comments_count: data.commentsCount } : p
            )
          );
        }
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Sticky top filter tab bar */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveCategory(tab.value)}
                  className={`flex min-h-[36px] shrink-0 items-center rounded-full px-3.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* New Post Button */}
          <button
            onClick={() => setComposerOpen(true)}
            aria-label="Create Post"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs transition hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Feed Scroll Container */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {isLoading ? (
            // Loading Skeleton Cards
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-4 w-4/5 rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
            ))
          ) : posts.length === 0 ? (
            // Empty State - Modern Interactive Welcome Card
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/60 p-8 text-center shadow-xs dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950 sm:p-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                <Plus className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Welcome to Work-Connect!
              </h3>
              <p className="mt-1.5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                This community feed is waiting for its first spark. Share updates, showcase achievements, or ask a question.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Share First Update</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory("qna");
                    setComposerOpen(true);
                  }}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <span>Ask a Question</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  tenantId={tenantId}
                  currentUserId={currentUser.id}
                  onOpenComments={handleOpenComments}
                />
              ))}

              {/* Cursor Pagination Trigger */}
              {hasMore && (
                <div className="flex justify-center pt-2 pb-6">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Loading more updates...</span>
                      </>
                    ) : (
                      <span>Load older posts</span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Post Composer Sheet / Modal */}
      <PostComposerModal
        open={composerOpen}
        onOpenChange={setComposerOpen}
        tenantId={tenantId}
        authorId={currentUser.id}
        onPostCreated={(newPost) => {
          if (newPost) {
            // Optimistically append the new post to the feed list without requiring a full page refresh
            const postWithAuthor = {
              ...newPost,
              author: {
                id: currentUser.id,
                full_name: currentUser.name,
                avatar_url: null,
                role: currentUser.role,
              },
              hasLiked: false,
            };
            setPosts((prev) => [postWithAuthor, ...prev.filter((p) => p.id !== newPost.id)]);
          } else {
            void fetchPosts(activeCategory);
          }
        }}
      />

      {/* Comments Drawer */}
      <MobileDrawer
        open={Boolean(selectedPost)}
        onOpenChange={(open) => !open && setSelectedPost(null)}
        title="Discussion & Comments"
        description={selectedPost ? `Comments for ${selectedPost.category}` : ""}
      >
        <div className="flex flex-col space-y-3 pb-2">
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-400">
                No comments yet. Join the conversation below!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {comment.author?.full_name || "Member"}
                    </span>
                    <span className="text-zinc-400">
                      {new Date(comment.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {comment.content}
                  </p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex h-11 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim() || isSubmittingComment}
              className="flex min-h-[44px] min-w-[70px] items-center justify-center rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
            >
              {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
            </button>
          </form>
        </div>
      </MobileDrawer>
    </div>
  );
}
