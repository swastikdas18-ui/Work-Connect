import { NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const body = await request.json().catch(() => ({}));
    const { userId, reactionType = "like" } = body;

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    return await withTenantContext(request, async (tenantId, db) => {
      let finalUserId = userId;
      if (!finalUserId) {
        const {
          data: { user },
        } = await db.auth.getUser();
        finalUserId = user?.id;
      }

      if (!finalUserId) {
        return NextResponse.json({ error: "User authentication required" }, { status: 401 });
      }

      // Check if reaction already exists for user and post within tenant
      const { data: existingReaction } = await db
        .from("post_reactions")
        .select("reaction_type")
        .eq("tenant_id", tenantId)
        .eq("post_id", postId)
        .eq("user_id", finalUserId)
        .eq("reaction_type", reactionType)
        .maybeSingle();

      let liked = false;

      if (existingReaction) {
        // Toggle off: Delete reaction
        await db
          .from("post_reactions")
          .delete()
          .eq("tenant_id", tenantId)
          .eq("post_id", postId)
          .eq("user_id", finalUserId)
          .eq("reaction_type", reactionType);

        // Fetch current likes count to decrement safely
        const { data: currentPost } = (await db
          .from("posts")
          .select("likes_count")
          .eq("tenant_id", tenantId)
          .eq("id", postId)
          .single()) as { data: { likes_count: number } | null };

        const newCount = Math.max((currentPost?.likes_count || 1) - 1, 0);

        await (
          db.from("posts").update as unknown as (values: { likes_count: number }) => {
            eq: (col: string, val: string) => {
              eq: (col2: string, val2: string) => Promise<unknown>;
            };
          }
        )({ likes_count: newCount })
          .eq("tenant_id", tenantId)
          .eq("id", postId);

        liked = false;
      } else {
        // Toggle on: Insert reaction
        const reactionInsert = {
          tenant_id: tenantId,
          post_id: postId,
          user_id: finalUserId,
          reaction_type: reactionType,
        };

        await (
          db.from("post_reactions").insert as unknown as (values: typeof reactionInsert) => Promise<unknown>
        )(reactionInsert);

        // Fetch current likes count to increment
        const { data: currentPost } = (await db
          .from("posts")
          .select("likes_count")
          .eq("tenant_id", tenantId)
          .eq("id", postId)
          .single()) as { data: { likes_count: number } | null };

        const newCount = (currentPost?.likes_count || 0) + 1;

        await (
          db.from("posts").update as unknown as (values: { likes_count: number }) => {
            eq: (col: string, val: string) => {
              eq: (col2: string, val2: string) => Promise<unknown>;
            };
          }
        )({ likes_count: newCount })
          .eq("tenant_id", tenantId)
          .eq("id", postId);

        liked = true;
      }

      // Fetch fresh post count
      const { data: updatedPost } = (await db
        .from("posts")
        .select("likes_count")
        .eq("tenant_id", tenantId)
        .eq("id", postId)
        .single()) as { data: { likes_count: number } | null };

      return NextResponse.json({
        success: true,
        liked,
        likesCount: updatedPost?.likes_count || 0,
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
