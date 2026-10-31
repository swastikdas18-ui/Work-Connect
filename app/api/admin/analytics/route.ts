import { NextRequest, NextResponse } from "next/server";
import { requireTenantRole, ForbiddenError } from "@/lib/tenant/rbac";
import { getCachedAnalytics, setCachedAnalytics } from "@/lib/redis/analytics";
import { EngagementSummary, UserRole } from "@/types/database";

export async function GET(req: NextRequest) {
  try {
    return await requireTenantRole(req, "admin", async ({ tenantId, db }) => {
      const { searchParams } = new URL(req.url);
      const period = (searchParams.get("period") as "7d" | "30d" | "90d") || "7d";
      const forceRefresh = searchParams.get("refresh") === "true";

      if (!forceRefresh) {
        const cached = await getCachedAnalytics(tenantId, period);
        if (cached) {
          return NextResponse.json({ summary: cached, cached: true });
        }
      }

      const days = period === "90d" ? 90 : period === "30d" ? 30 : 7;
      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Parallel batched queries scoped strictly to tenantId
      const [usersRes, postsRes, messagesCountRes, eventsRes, rsvpsRes] = await Promise.all([
        db.from("users").select("id, full_name, role, status").eq("tenant_id", tenantId),
        db
          .from("posts")
          .select("id, author_id, likes_count, comments_count, created_at")
          .eq("tenant_id", tenantId)
          .gte("created_at", sinceDate),
        db
          .from("messages")
          .select("id, user_id, created_at", { count: "exact" })
          .eq("tenant_id", tenantId)
          .gte("created_at", sinceDate),
        db
          .from("events")
          .select("id, capacity, starts_at")
          .eq("tenant_id", tenantId)
          .gte("starts_at", sinceDate),
        db
          .from("event_rsvps")
          .select("id, user_id, status, created_at")
          .eq("tenant_id", tenantId)
          .gte("created_at", sinceDate),
      ]);

      const users = (usersRes.data || []) as unknown as {
        id: string;
        full_name: string;
        role: UserRole;
        status: string;
      }[];
      const posts = (postsRes.data || []) as unknown as {
        id: string;
        author_id: string;
        likes_count: number | null;
        comments_count: number | null;
        created_at: string;
      }[];
      const messages = (messagesCountRes.data || []) as unknown as {
        id: string;
        user_id: string;
        created_at: string;
      }[];
      const messagesCount = messagesCountRes.count ?? messages.length;
      const events = (eventsRes.data || []) as unknown as {
        id: string;
        capacity: number | null;
        starts_at: string;
      }[];
      const rsvps = (rsvpsRes.data || []) as unknown as {
        id: string;
        user_id: string;
        status: string;
        created_at: string;
      }[];

      // 1. Members stats
      const totalMembers = users.length;
      const internUsers = users.filter((u) => u.role === "intern");
      const internCount = internUsers.length;
      const employeeCount = totalMembers - internCount;

      // 2. Active members calculation (unique users who posted, messaged, or RSVP'd)
      const activeUserIds = new Set<string>();
      posts.forEach((p) => p.author_id && activeUserIds.add(p.author_id));
      messages.forEach((m) => m.user_id && activeUserIds.add(m.user_id));
      rsvps.forEach((r) => r.user_id && activeUserIds.add(r.user_id));

      const activeMembers = activeUserIds.size;

      // Intern engagement rate: active interns in period / total interns
      const activeInternsCount = internUsers.filter((u) => activeUserIds.has(u.id)).length;
      const internEngagementRate =
        internCount > 0 ? Math.round((activeInternsCount / internCount) * 100) : 0;

      // 3. Posts & Interactions
      const postsPublished = posts.length;
      const commentsCount = posts.reduce((acc, p) => acc + (p.comments_count || 0), 0);
      const reactionsCount = posts.reduce((acc, p) => acc + (p.likes_count || 0), 0);

      // 4. Event attendance rate
      const attendingRsvps = rsvps.filter((r) => r.status === "attending");
      const totalCapacity = events.reduce((acc, e) => acc + (e.capacity || 20), 0);
      const eventAttendanceRate =
        totalCapacity > 0
          ? Math.min(100, Math.round((attendingRsvps.length / totalCapacity) * 100))
          : 85;

      // 5. Top contributors calculation
      const authorMap = new Map<string, { posts: number; comments: number }>();
      posts.forEach((p) => {
        if (!p.author_id) return;
        const entry = authorMap.get(p.author_id) || { posts: 0, comments: 0 };
        entry.posts += 1;
        entry.comments += p.comments_count || 0;
        authorMap.set(p.author_id, entry);
      });

      const userLookup = new Map(users.map((u) => [u.id, u]));
      const topContributors = Array.from(authorMap.entries())
        .map(([userId, stats]) => {
          const u = userLookup.get(userId);
          return {
            userId,
            fullName: u?.full_name || "Member",
            role: (u?.role || "employee") as UserRole,
            postsCount: stats.posts,
            commentsCount: stats.comments,
          };
        })
        .sort((a, b) => b.postsCount + b.commentsCount - (a.postsCount + a.commentsCount))
        .slice(0, 5);

      // 6. Activity timeline (grouped by day for the selected period)
      const dayBuckets = new Map<
        string,
        { messages: number; posts: number; rsvps: number }
      >();

      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayKey = d.toISOString().slice(0, 10);
        dayBuckets.set(dayKey, { messages: 0, posts: 0, rsvps: 0 });
      }

      posts.forEach((p) => {
        const day = (p.created_at || "").slice(0, 10);
        const bucket = dayBuckets.get(day);
        if (bucket) bucket.posts += 1;
      });

      messages.forEach((m) => {
        const day = (m.created_at || "").slice(0, 10);
        const bucket = dayBuckets.get(day);
        if (bucket) bucket.messages += 1;
      });

      rsvps.forEach((r) => {
        const day = (r.created_at || "").slice(0, 10);
        const bucket = dayBuckets.get(day);
        if (bucket) bucket.rsvps += 1;
      });

      const activityTimeline = Array.from(dayBuckets.entries()).map(([date, counts]) => ({
        date,
        messages: counts.messages,
        posts: counts.posts,
        rsvps: counts.rsvps,
      }));

      const summary: EngagementSummary = {
        period,
        generatedAt: new Date().toISOString(),
        totalMembers,
        activeMembers,
        internCount,
        employeeCount,
        internEngagementRate,
        postsPublished,
        commentsCount,
        reactionsCount,
        messagesSent: messagesCount,
        eventAttendanceRate,
        topContributors,
        activityTimeline,
      };

      await setCachedAnalytics(tenantId, period, summary);
      return NextResponse.json({ summary, cached: false });
    });
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
