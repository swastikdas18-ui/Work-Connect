"use client";

import * as React from "react";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { MessageRow } from "@/types/database";
import { createBrowserSupabaseClient } from "@/lib/db/browser";
import { TypingIndicator } from "./TypingIndicator";

interface ChatWindowProps {
  tenantId: string;
  channelId: string;
  currentUser: {
    id: string;
    name: string;
  };
  initialMessages?: MessageRow[];
}

export function ChatWindow({
  tenantId,
  channelId,
  currentUser,
  initialMessages = [],
}: ChatWindowProps) {
  const [messages, setMessages] = React.useState<MessageRow[]>(initialMessages);
  const [inputText, setInputText] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [typingUsers, setTypingUsers] = React.useState<string[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messageContainerRef = React.useRef<HTMLDivElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom on new message
  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Subscribe to live messages and typing indicators via Supabase / Redis Realtime
  React.useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const realtimeChannelName = `tenant:${tenantId}:channel:${channelId}`;

    const channelSubscription = supabase
      .channel(realtimeChannelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;
          if (newMessage.channel_id === channelId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
            // Mark channel as read
            fetch(`/api/channels/${channelId}/read`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-tenant-id": tenantId,
              },
              body: JSON.stringify({
                userId: currentUser.id,
                lastReadMessageId: newMessage.id,
              }),
            }).catch(() => null);
          }
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, name, isTyping } = payload?.payload || {};
        if (userId && userId !== currentUser.id) {
          setTypingUsers((prev) => {
            if (isTyping) {
              return prev.includes(name) ? prev : [...prev, name];
            } else {
              return prev.filter((u) => u !== name);
            }
          });
        }
      })
      .subscribe();

    // Mark channel read on mount
    fetch(`/api/channels/${channelId}/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": tenantId,
      },
      body: JSON.stringify({ userId: currentUser.id }),
    }).catch(() => null);

    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [tenantId, channelId, currentUser.id]);

  // Typing debounce dispatcher
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    // Dispatch typing true
    fetch(`/api/channels/${channelId}/typing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": tenantId,
      },
      body: JSON.stringify({
        userId: currentUser.id,
        name: currentUser.name,
        isTyping: true,
      }),
    }).catch(() => null);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      fetch(`/api/channels/${channelId}/typing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          name: currentUser.name,
          isTyping: false,
        }),
      }).catch(() => null);
    }, 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputText("");

    // Optimistic UI message insertion
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: MessageRow = {
      id: optimisticId,
      tenant_id: tenantId,
      channel_id: channelId,
      user_id: currentUser.id,
      content: trimmed,
      media_urls: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          channelId,
          userId: currentUser.id,
          content: trimmed,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const result = await response.json();
      if (result.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? result.message : m))
        );
      }
    } catch {
      // Revert optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
      {/* Infinite scroll / Message stream container */}
      <div
        ref={messageContainerRef}
        className="flex-1 space-y-4 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-zinc-500">
            No messages yet. Send the first message in #{channelId}!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {isMe ? "ME" : msg.user_id.slice(0, 2).toUpperCase()}
                </div>
                <div
                  className={`flex max-w-[80%] flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {isMe ? "You" : msg.user_id}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className={`mt-1 rounded-2xl px-4 py-2.5 text-sm ${
                      isMe
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Animated Typing Indicator above the sticky input */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Sticky chat input bar at bottom with 44px touch targets */}
      <footer className="sticky bottom-0 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Attach file"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={`Message #${channelId}...`}
            className="flex h-11 flex-1 rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-blue-400"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            aria-label="Send message"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </footer>
    </div>
  );
}

