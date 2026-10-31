"use client";

import * as React from "react";
import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function InviteAcceptContent() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();

  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successData, setSuccessData] = React.useState<{
    tenantName?: string;
    role?: string;
  } | null>(null);

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/tenant/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          fullName: fullName.trim(),
          password: password.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to redeem invitation");
      }

      setSuccessData({
        tenantName: data.tenant?.name || "Workspace",
        role: data.role,
      });

      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error accepting invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
        <Users className="h-6 w-6" />
      </div>

      <div className="mt-4 text-center">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Join Work-Connect Workspace
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          You have been invited to collaborate with your team.
        </p>
      </div>

      {errorMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successData ? (
        <div className="mt-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Welcome to {successData.tenantName}!
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            Your role has been set to {successData.role}. Redirecting to dashboard...
          </p>
        </div>
      ) : (
        <form onSubmit={handleAcceptInvite} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase">
              Your Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className="mt-1 flex h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase">
              Create Password (Optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 flex h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !fullName.trim()}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Accept Invite & Join Workspace"
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-900" />}>
        <InviteAcceptContent />
      </Suspense>
    </div>
  );
}
