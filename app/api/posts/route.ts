import { NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";
import { PostCategory, Post, UserRole } from "@/types/database";

const VALID_CATEGORIES: PostCategory[] = [
  "announcement",
  "general",
  "intern_spotlight",
  "qna",
  "event",
];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get("limit") || "20", 10);
    const limit = isNaN(limitParam) ? 20 : Math.min(Math.max(limitParam, 1), 50);
    const cursor = url.searchParams.get("cursor");
    const category = url.searchParams.get("category");
    const currentUserId = url.searchParams.get("userId") || "";

    return await withTenantContext(request, async (tenantId, db) => {
      let query = db
        .from("posts")
        .select(`
          *,
          author:profiles!posts_author_id_fkey (
            id,
            full_name,
            avatar_url,
            role
          )
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (category && category !== "all" && VALID_CATEGORIES.includes(category as PostCategory)) {
        query = query.eq("category", category);
      }

      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      let { data: postsData, error } = await query;

      // Fallback: If posts_author_id_fkey targets users or profiles is not used, retry with author:users!author_id
      if (error && error.message.includes("posts_author_id_fkey")) {
        let fallbackQuery = db
          .from("posts")
          .select(`
            *,
            author:users!author_id (
              id,
              full_name,
              avatar_url,
              role
            )
          `)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (category && category !== "all" && VALID_CATEGORIES.includes(category as PostCategory)) {
          fallbackQuery = fallbackQuery.eq("category", category);
        }

        if (cursor) {
          fallbackQuery = fallbackQuery.lt("created_at", cursor);
        }

        const fallbackResult = await fallbackQuery;
        postsData = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const posts = (postsData || []) as (Post & {
        author?: { id: string; full_name: string; avatar_url: string | null; role: string } | null;
      })[];

      // Fetch current user reactions if userId provided
      let userReactionMap = new Set<string>();
      if (currentUserId && posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        const { data: reactions } = await (
          db.from("post_reactions").select("post_id") as unknown as {
            eq: (col: string, val: string) => {
              eq: (col2: string, val2: string) => {
                in: (col3: string, ids: string[]) => Promise<{ data: { post_id: string }[] | null }>;
              };
            };
          }
        )
          .eq("tenant_id", tenantId)
          .eq("user_id", currentUserId)
          .in("post_id", postIds);

        if (reactions) {
          userReactionMap = new Set(reactions.map((r) => r.post_id));
        }
      }

      const enrichedPosts = posts.map((post) => ({
        ...post,
        hasLiked: userReactionMap.has(post.id),
      }));

      const nextCursor =
        enrichedPosts.length === limit ? enrichedPosts[enrichedPosts.length - 1].created_at : null;

      return NextResponse.json({
        posts: enrichedPosts,
        nextCursor,
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, category, mediaUrls = [], authorId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Post content is required" }, { status: 400 });
    }

    if (!category || !VALID_CATEGORIES.includes(category as PostCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    return await withTenantContext(request, async (tenantId, db) => {
      // Author can be explicitly passed or read from authenticated session
      let finalAuthorId = authorId;
      if (!finalAuthorId) {
        const {
          data: { user },
        } = await db.auth.getUser();
        finalAuthorId = user?.id;
      }

      if (!finalAuthorId) {
        return NextResponse.json({ error: "Author identity required" }, { status: 401 });
      }

      const postInsert = {
        tenant_id: tenantId,
        author_id: finalAuthorId,
        content: content.trim(),
        category: category as PostCategory,
        media_urls: mediaUrls,
        likes_count: 0,
        comments_count: 0,
      };

      // RBAC check: only owner, admin, or moderator can author announcements
      if (category === "announcement") {
        const { data: authorRecord } = (await db
          .from("users")
          .select("role")
          .eq("tenant_id", tenantId)
          .eq("id", finalAuthorId)
          .single()) as { data: { role: UserRole } | null };

        const role = authorRecord?.role;
        if (!role || !["owner", "admin", "moderator"].includes(role)) {
          return NextResponse.json(
            { error: "Forbidden: Only owners, admins, and moderators can post announcements" },
            { status: 403 }
          );
        }
      }

      const postsTable = db.from("posts");
      const { data: insertedPost, error } = await (
        postsTable.insert as unknown as (values: typeof postInsert) => {
          select: () => {
            single: () => Promise<{ data: Post | null; error: { message: string } | null }>;
          };
        }
      )(postInsert)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, post: insertedPost }, { status: 201 });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
