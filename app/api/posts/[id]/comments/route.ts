import { NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";
import { PostComment } from "@/types/database";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    return await withTenantContext(request, async (tenantId, db) => {
      const { data: comments, error } = await db
        .from("post_comments")
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
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ comments: comments || [] });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const body = await request.json();
    const { content, parentCommentId = null, authorId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    return await withTenantContext(request, async (tenantId, db) => {
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

      const commentInsert = {
        tenant_id: tenantId,
        post_id: postId,
        author_id: finalAuthorId,
        content: content.trim(),
        parent_comment_id: parentCommentId,
      };

      const commentsTable = db.from("post_comments");
      const { data: insertedComment, error: commentError } = await (
        commentsTable.insert as unknown as (values: typeof commentInsert) => {
          select: () => {
            single: () => Promise<{ data: PostComment | null; error: { message: string } | null }>;
          };
        }
      )(commentInsert)
        .select()
        .single();

      if (commentError) {
        return NextResponse.json({ error: commentError.message }, { status: 500 });
      }

      // Auto-increment comments_count on post
      const { data: currentPost } = (await db
        .from("posts")
        .select("comments_count")
        .eq("tenant_id", tenantId)
        .eq("id", postId)
        .single()) as { data: { comments_count: number } | null };

      const newCommentsCount = (currentPost?.comments_count || 0) + 1;

      await (
        db.from("posts").update as unknown as (values: { comments_count: number }) => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => Promise<unknown>;
          };
        }
      )({ comments_count: newCommentsCount })
        .eq("tenant_id", tenantId)
        .eq("id", postId);

      return NextResponse.json(
        { success: true, comment: insertedComment, commentsCount: newCommentsCount },
        { status: 201 }
      );
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
