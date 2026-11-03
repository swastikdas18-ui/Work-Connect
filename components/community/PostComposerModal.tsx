"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { ImagePlus, X, Loader2, Link as LinkIcon } from "lucide-react";
import { PostCategory } from "@/types/database";

interface PostComposerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  authorId: string;
  onPostCreated?: (createdPost?: import("@/types/database").Post) => void;
}

const CATEGORIES: { label: string; value: PostCategory }[] = [
  { label: "General", value: "general" },
  { label: "Announcements", value: "announcement" },
  { label: "Intern Spotlight", value: "intern_spotlight" },
  { label: "Q&A", value: "qna" },
  { label: "Event", value: "event" },
];

export function PostComposerModal({
  open,
  onOpenChange,
  tenantId,
  authorId,
  onPostCreated,
}: PostComposerModalProps) {
  const [content, setContent] = React.useState("");
  const [category, setCategory] = React.useState<PostCategory>("general");
  const [mediaUrls, setMediaUrls] = React.useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = React.useState("");
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/media/upload", {
          method: "POST",
          headers: {
            "x-tenant-id": tenantId,
          },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.publicUrl) {
            setMediaUrls((prev) => [...prev, data.publicUrl]);
          }
        }
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddMediaUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    setMediaUrls((prev) => [...prev, trimmed]);
    setImageUrlInput("");
    setShowUrlInput(false);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          content: content.trim(),
          category,
          mediaUrls,
          authorId,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        setContent("");
        setMediaUrls([]);
        setCategory("general");
        onOpenChange(false);
        onPostCreated?.(data?.post);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[90dvh] flex-col rounded-t-[20px] border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 outline-none md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:rounded-2xl md:border">
          {/* Mobile Drag Indicator */}
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700 md:hidden" />

          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 p-4 dark:border-zinc-800">
            <Drawer.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Create Community Post
            </Drawer.Title>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close modal"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-4">
            {/* Category Selector Pills */}
            <div className="mb-3">
              <label className="text-xs font-semibold text-zinc-500 uppercase">
                Select Category
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`flex min-h-[36px] items-center rounded-full px-3 text-xs font-medium transition ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Post Content Input */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening in your team, project, or learning journey?"
              rows={4}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-blue-400"
            />

            {/* Media Attachment Previews */}
            {mediaUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {mediaUrls.map((url, idx) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Attachment ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      aria-label="Remove image"
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Paste Image URL Input */}
            {showUrlInput && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950">
                <LinkIcon className="h-4 w-4 text-zinc-400 shrink-0" />
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="Paste image URL (e.g. https://example.com/photo.png)..."
                  className="w-full bg-transparent text-xs text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={handleAddMediaUrl}
                  disabled={!imageUrlInput.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <div className="flex items-center gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  aria-label="Add images"
                  className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  ) : (
                    <ImagePlus className="h-4 w-4 text-blue-600" />
                  )}
                  <span>Upload Files</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInput((prev) => !prev)}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <LinkIcon className="h-4 w-4 text-zinc-400" />
                  <span className="hidden sm:inline">Image URL</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className="flex min-h-[44px] min-w-[80px] items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
              </button>
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

