"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { X, Copy, Check, Loader2, Send } from "lucide-react";
import { UserRole } from "@/types/database";

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  currentUserId: string;
}

const INVITE_ROLES: { label: string; value: UserRole }[] = [
  { label: "Employee", value: "employee" },
  { label: "Intern", value: "intern" },
  { label: "Moderator", value: "moderator" },
  { label: "Admin", value: "admin" },
];

export function InviteModal({ open, onOpenChange, tenantId, currentUserId }: InviteModalProps) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("employee");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [generatedLink, setGeneratedLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setGeneratedLink(null);

    try {
      const res = await fetch("/api/tenant/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
          "x-user-id": currentUserId,
        },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      if (res.ok) {
        const data = await res.json();
        const fullInviteUrl = `${window.location.origin}${data.inviteLink}`;
        setGeneratedLink(fullInviteUrl);
        setEmail("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignored
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[90dvh] flex-col rounded-t-[20px] border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 outline-none md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-2xl md:border">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700 md:hidden" />

          <div className="flex items-center justify-between border-b border-zinc-100 p-4 dark:border-zinc-800">
            <Drawer.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Invite Member to Workspace
            </Drawer.Title>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto p-4">
            <form onSubmit={handleGenerateInvite} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase">
                  Member Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="mt-1.5 flex h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase">
                  Assigned Workspace Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="mt-1.5 flex h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950"
                >
                  {INVITE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!email.trim() || isSubmitting}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Create Invitation</span>
                  </>
                )}
              </button>
            </form>

            {generatedLink && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Invitation Created!
                </span>
                <p className="mt-0.5 text-xs text-zinc-500">Share this link with your team member:</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-900"
                  />
                  <button
                    onClick={handleCopy}
                    aria-label="Copy invite link"
                    className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

