"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Hash,
  Search,
  Send,
  MoreVertical,
  Users,
  Info,
  Loader2,
  Smile,
  Paperclip,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/db/browser";
import { MobileDrawer } from "@/components/ui/MobileDrawer";
import { useStoredUser, useIsMounted } from "@/lib/hooks/useMounted";

interface MessageAuthor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface ChatMessage {
  id: string;
  tenant_id: string;
  channel_id: string;
  user_id: string;
  content: string;
  media_urls?: string[];
  created_at: string;
  author?: MessageAuthor | null;
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = typeof window !== "undefined" ? Date.now() : 0;
    if (!now) return "";
    const diffSeconds = Math.floor((now - date.getTime()) / 1000);
    if (diffSeconds < 60) return "just now";
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function ChannelChatPage() {
  const params = useParams();
  const channelId = (params?.channelId as string) || "general";
  const mounted = useIsMounted();
  const storedUser = useStoredUser();

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputText, setInputText] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [memberCount] = React.useState(18);
  const nextTempIdRef = React.useRef(1);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const activeTenantId = "00000000-0000-0000-0000-000000000001";
  const currentUser = mounted
    ? {
        id: "00000000-0000-0000-0000-000000000001",
        name: storedUser.name,
        role: storedUser.role,
      }
    : {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Alex Carter",
        role: "intern",
      };

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // 1. Fetch historical channel messages
  React.useEffect(() => {
    let ignore = false;

    async function loadMessages() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/channels/${channelId}/messages`, {
          headers: { "x-tenant-id": activeTenantId },
        });
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.messages) {
            setMessages(data.messages);
            setTimeout(() => scrollToBottom("auto"), 50);
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadMessages();

    return () => {
      ignore = true;
    };
  }, [channelId, activeTenantId, scrollToBottom]);

  // 2. Supabase Realtime Subscription: room:${tenantId}:${channelId}
  React.useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const roomName = `room:${activeTenantId}:${channelId}`;

    const channelSubscription = supabase
      .channel(roomName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev;
            }
            return [...prev, newMsg];
          });
          scrollToBottom("smooth");
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channelSubscription);
    };
  }, [channelId, activeTenantId, scrollToBottom]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (!isLoading) {
      scrollToBottom("smooth");
    }
  }, [messages.length, isLoading, scrollToBottom]);

  // 3. Send Message Handler with Optimistic Updates
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    nextTempIdRef.current += 1;
    const tempId = `temp-${nextTempIdRef.current}`;
    const nowIso = "2026-11-02T00:00:00.000Z";
    const optimisticMessage: ChatMessage = {
      id: tempId,
      tenant_id: activeTenantId,
      channel_id: channelId,
      user_id: currentUser.id,
      content: trimmed,
      created_at: nowIso,
      author: {
        id: currentUser.id,
        full_name: currentUser.name,
        avatar_url: null,
        role: currentUser.role,
      },
    };

    // Optimistically update UI
    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    scrollToBottom("smooth");

    setIsSending(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": activeTenantId,
        },
        body: JSON.stringify({
          channelId,
          userId: currentUser.id,
          content: trimmed,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          // Replace optimistic placeholder with confirmed record
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId ? { ...data.message, author: optimisticMessage.author } : msg
            )
          );
        }
      }
    } catch {
      // Keep optimistic message or handle error
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : messages;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
      {/* Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex items-center gap-2">
          {/* Back button on mobile */}
          <Link
            href="/feed"
            aria-label="Back to channels"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-zinc-500" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {channelId}
                </h1>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" title="Active channel" />
              </div>
              <p className="hidden text-[11px] text-zinc-500 dark:text-zinc-400 sm:block">
                Workspace communication & mentorship channel
              </p>
            </div>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {isSearching ? (
            <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900">
              <Search className="h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channel..."
                autoFocus
                className="w-28 bg-transparent text-xs text-zinc-900 outline-none dark:text-zinc-100 sm:w-44"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearching(false);
                }}
                className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSearching(true)}
              aria-label="Search Messages"
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            aria-label="Channel Info"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center space-y-2 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <p className="text-xs">Loading channel history...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <Hash className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Welcome to #{channelId}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              This is the beginning of the #{channelId} channel. Send a greeting to start collaborating!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((msg, idx) => {
              const prevMsg = filteredMessages[idx - 1];
              const isSameAuthor = prevMsg && prevMsg.user_id === msg.user_id;
              const isCurrentUser = msg.user_id === currentUser.id;
              const authorName = msg.author?.full_name || (isCurrentUser ? currentUser.name : "Member");
              const authorRole = msg.author?.role || (isCurrentUser ? currentUser.role : "intern");

              return (
                <div
                  key={msg.id}
                  className={`group flex items-start gap-3 transition-colors ${
                    isSameAuthor ? "mt-1" : "mt-4"
                  }`}
                >
                  {/* Avatar (only show on first message of a consecutive group) */}
                  {!isSameAuthor ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-xs font-bold text-blue-600 dark:text-blue-400">
                      {authorName.slice(0, 2).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-9 shrink-0" />
                  )}

                  <div className="flex-1 overflow-hidden">
                    {!isSameAuthor && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {authorName}
                        </span>
                        <span className="rounded-md border border-zinc-200 bg-zinc-100 px-1.5 py-0.2 text-[9px] font-semibold uppercase text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                          {authorRole}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {formatRelativeTime(msg.created_at)}
                        </span>
                      </div>
                    )}

                    <div className="mt-0.5 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed break-words whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sticky Bottom Message Composer */}
      <div className="border-t border-zinc-200 bg-white/95 p-3 dark:border-zinc-800 dark:bg-zinc-950/95 sm:p-4">
        <form onSubmit={handleSendMessage} className="relative flex flex-col rounded-2xl border border-zinc-300 bg-white shadow-xs focus-within:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channelId}... (Enter to send, Shift+Enter for new line)`}
            className="max-h-32 min-h-[44px] w-full resize-none bg-transparent px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
          />

          <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2 dark:border-zinc-800/60">
            <div className="flex items-center gap-1 text-zinc-400">
              <button
                type="button"
                aria-label="Attach File"
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Add Emoji"
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <Smile className="h-4 w-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              aria-label="Send Message"
              className="flex min-h-[36px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-40"
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Channel Info Side Drawer */}
      <MobileDrawer
        open={infoOpen}
        onOpenChange={setInfoOpen}
        title={`About #${channelId}`}
        description="Channel details & member status"
      >
        <div className="space-y-4 pb-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <Info className="h-4 w-4 text-zinc-400" />
              Topic
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Main discussion channel for questions, technical updates, and community connection.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-400" />
                Members
              </span>
              <span className="text-zinc-500">{memberCount} online</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              All workspace members have access to this public channel.
            </p>
          </div>
        </div>
      </MobileDrawer>
    </div>
  );
}
