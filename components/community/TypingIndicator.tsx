"use client";

interface TypingIndicatorProps {
  typingUsers: string[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing...`
      : typingUsers.length === 2
        ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
        : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-zinc-500 animate-fade-in dark:text-zinc-400">
      {/* Animated Three-Dot Bubble */}
      <div className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" />
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
      </div>
      <span className="font-medium italic">{label}</span>
    </div>
  );
}

