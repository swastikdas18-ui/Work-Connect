"use client";

import * as React from "react";
import {
  Users,
  MessageSquare,
  Sparkles,
  CalendarCheck,
  TrendingUp,
  RefreshCw,
  Award,
  AlertCircle,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { EngagementSummary } from "@/types/database";

export interface AnalyticsDashboardProps {
  tenantId: string;
  currentUserId?: string;
}

type Period = "7d" | "30d" | "90d";

export function AnalyticsDashboard({ tenantId, currentUserId }: AnalyticsDashboardProps) {
  const [period, setPeriod] = React.useState<Period>("7d");
  const [data, setData] = React.useState<EngagementSummary | null>(null);
  const [isCached, setIsCached] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fetchAnalytics = React.useCallback(
    async (targetPeriod: Period, forceRefresh = false) => {
      if (forceRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      setErrorMessage(null);
      try {
        const url = new URL("/api/admin/analytics", window.location.origin);
        url.searchParams.set("period", targetPeriod);
        if (forceRefresh) url.searchParams.set("refresh", "true");

        const headers: Record<string, string> = {
          "x-tenant-id": tenantId,
        };
        if (currentUserId) {
          headers["x-user-id"] = currentUserId;
        }

        const res = await fetch(url.toString(), { headers });

        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("Access restricted: Administrator privileges required.");
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}: Failed to load analytics`);
        }

        const json = await res.json();
        setData(json.summary);
        setIsCached(Boolean(json.cached));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error loading dashboard metrics.";
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [tenantId, currentUserId]
  );

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      if (!ignore) {
        await fetchAnalytics(period);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [fetchAnalytics, period]);

  const activeMemberRatio = React.useMemo(() => {
    if (!data || data.totalMembers === 0) return 0;
    return Math.min(100, Math.round((data.activeMembers / data.totalMembers) * 100));
  }, [data]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Top Header & Interactive Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Workspace Analytics & Engagement
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Real-time multi-tenant telemetry on intern participation, retention, and community activity.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Period Selector Pills */}
          <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {(["7d", "30d", "90d"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition ${
                  period === p
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>

          {/* Force Refresh Button */}
          <button
            onClick={() => fetchAnalytics(period, true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
            title="Bypass Redis cache and regenerate metrics"
            aria-label="Refresh metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Cache Status Badge */}
      {data && !isLoading && (
        <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 -mt-2">
          <span>
            Telemetry generated: {new Date(data.generatedAt).toLocaleTimeString()} (
            {isCached ? "Served via Redis Warm Cache" : "Live PostgreSQL Computation"})
          </span>
          {isCached && (
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-medium">
              TTL Cache Active (1h)
            </span>
          )}
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => fetchAnalytics(period, true)}
            className="rounded-lg px-2 py-1 font-semibold hover:bg-red-100 dark:hover:bg-red-900/40"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 animate-pulse dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="h-4 w-24 rounded-md bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-8 w-16 rounded-md bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-32 rounded-md bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Active Members (WAU/MAU) */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                  Active Members
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <Users className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {data.activeMembers}
                  </span>
                  <span className="text-xs text-zinc-400">of {data.totalMembers} total</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${activeMemberRatio}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {activeMemberRatio}% participation rate this period
                </p>
              </div>
            </div>

            {/* Card 2: Intern Engagement */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                  Intern Engagement
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                  <GraduationCap className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {data.internEngagementRate}%
                  </span>
                  <span className="text-xs text-zinc-400">({data.internCount} interns)</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, data.internEngagementRate)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Interns active in posts, chat, and RSVP
                </p>
              </div>
            </div>

            {/* Card 3: Communications & Posts */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                  Interactions
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                  <MessageSquare className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {data.messagesSent + data.postsPublished}
                  </span>
                  <span className="text-xs text-zinc-400">total interactions</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>{data.messagesSent} chats</span>
                  <span>•</span>
                  <span>{data.postsPublished} posts</span>
                  <span>•</span>
                  <span>{data.commentsCount} comments</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                  {data.reactionsCount} reactions registered
                </p>
              </div>
            </div>

            {/* Card 4: Event Attendance Rate */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                  Workshop Attendance
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <CalendarCheck className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {data.eventAttendanceRate}%
                  </span>
                  <span className="text-xs text-zinc-400">capacity filled</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, data.eventAttendanceRate)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Average RSVP conversion across events
                </p>
              </div>
            </div>
          </div>

          {/* Deep Dives: Member Ratio & Top Contributors */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Cohort Composition Bar */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-1">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Cohort Demographics
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Interns vs. Regular Staff Distribution
              </p>

              <div className="mt-6 flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                      <GraduationCap className="h-4 w-4 text-purple-500" />
                      <span>Interns</span>
                    </span>
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {data.internCount} (
                      {data.totalMembers > 0
                        ? Math.round((data.internCount / data.totalMembers) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{
                        width: `${
                          data.totalMembers > 0 ? (data.internCount / data.totalMembers) * 100 : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                      <Briefcase className="h-4 w-4 text-blue-500" />
                      <span>Full-Time Employees</span>
                    </span>
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {data.employeeCount} (
                      {data.totalMembers > 0
                        ? Math.round((data.employeeCount / data.totalMembers) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${
                          data.totalMembers > 0
                            ? (data.employeeCount / data.totalMembers) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Insight:</span>{" "}
                Interns comprise{" "}
                {data.totalMembers > 0
                  ? Math.round((data.internCount / data.totalMembers) * 100)
                  : 0}
                % of this workspace with a {data.internEngagementRate}% engagement velocity.
              </div>
            </div>

            {/* Top Contributors List */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Top Active Contributors
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Members generating highest community engagement in {period}
                  </p>
                </div>
                <Award className="h-4 w-4 text-amber-500" />
              </div>

              {data.topContributors.length === 0 ? (
                <div className="mt-8 flex flex-col items-center justify-center py-6 text-center text-xs text-zinc-400">
                  <Sparkles className="h-8 w-8 text-zinc-300 mb-2 dark:text-zinc-700" />
                  <span>No post or comment activity recorded for this period yet.</span>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {data.topContributors.map((c, idx) => (
                    <div
                      key={c.userId}
                      className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                            {c.fullName}
                          </p>
                          <span className="inline-block rounded-xs bg-zinc-100 px-1.5 py-0.2 text-[10px] font-medium text-zinc-500 uppercase dark:bg-zinc-800 dark:text-zinc-400">
                            {c.role}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{c.postsCount} posts</span>
                        <span>•</span>
                        <span>{c.commentsCount} comments</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
