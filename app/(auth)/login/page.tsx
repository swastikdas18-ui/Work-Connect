"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Sparkles, Building2, UserCheck, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/db/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [tenantId, setTenantId] = React.useState("00000000-0000-0000-0000-000000000001");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please provide both email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.session) {
        if (typeof window !== "undefined") {
          localStorage.setItem("work_connect_tenant_id", tenantId);
          localStorage.setItem("work_connect_user", JSON.stringify(data.user));
          document.cookie = `work_connect_tenant_id=${tenantId}; path=/; max-age=2592000; SameSite=Lax`;
        }
        router.push("/feed");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Google OAuth sign in failed.");
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (role: "intern" | "mentor") => {
    setIsLoading(true);
    const demoUser =
      role === "intern"
        ? {
            id: "00000000-0000-0000-0000-0000000000aa",
            name: "Alex Carter (Demo Intern)",
            role: "intern",
            email: "intern.demo@workconnect.internal",
          }
        : {
            id: "00000000-0000-0000-0000-000000000001",
            name: "Sarah Jenkins (Demo Mentor/Admin)",
            role: "admin",
            email: "mentor.demo@workconnect.internal",
          };

    if (typeof window !== "undefined") {
      localStorage.setItem("work_connect_tenant_id", tenantId);
      localStorage.setItem("work_connect_user", JSON.stringify(demoUser));
      document.cookie = `work_connect_tenant_id=${tenantId}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `work_connect_user_role=${demoUser.role}; path=/; max-age=2592000; SameSite=Lax`;
    }

    setTimeout(() => {
      router.push("/feed");
    }, 400);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-4 py-8 text-zinc-100 selection:bg-blue-600 selection:text-white">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Glowing border card wrapper */}
        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {/* Header Branding */}
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Work-Connect</h1>
            <p className="mt-1 text-xs text-zinc-400">
              Multi-Tenant Enterprise Portal for Cohorts &amp; Teams
            </p>
          </div>

          {/* Error notification */}
          {errorMsg && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-400">
              {errorMsg}
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300">
                Workspace ID
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-xs text-zinc-200 outline-none transition focus:border-blue-500"
                  placeholder="00000000-0000-0000-0000-000000000001"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300">
                Email Address
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 pl-9 pr-3 py-2.5 text-xs text-zinc-200 outline-none transition focus:border-blue-500"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 pl-9 pr-3 py-2.5 text-xs text-zinc-200 outline-none transition focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-500 active:scale-98 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center text-xs text-zinc-500">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <span className="relative bg-zinc-900 px-3 text-[11px] uppercase tracking-wider text-zinc-500">
              Or continue with
            </span>
          </div>

          {/* Google OAuth Trigger Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="flex min-h-[44px] w-full items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 active:scale-98"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Quick Demo Logins for Instant Exploring */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 mb-2">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Instant Demo Access</span>
              </span>
              <span className="text-zinc-500">No verification required</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin("intern")}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-blue-500/40 hover:bg-zinc-800 transition"
              >
                <UserCheck className="h-3.5 w-3.5 text-blue-400" />
                <span>Demo Intern</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin("mentor")}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-purple-500/40 hover:bg-zinc-800 transition"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                <span>Demo Mentor</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-4 text-center text-xs text-zinc-600">
          Work-Connect multi-tenant workspace isolation active.
        </p>
      </div>
    </div>
  );
}

