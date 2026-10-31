import { NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";
import { publishTenantMessage } from "@/lib/redis/client";
import { MessageRow, Database } from "@/types/database";

interface SendMessageBody {
  channelId: string;
  userId: string;
  content: string;
  mediaUrls?: string[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendMessageBody;
    const { channelId, userId, content, mediaUrls = [] } = body;

    if (!channelId || !content || !content.trim() || !userId) {
      return NextResponse.json(
        { error: "channelId, userId, and non-empty content are required" },
        { status: 400 }
      );
    }

    return await withTenantContext(request, async (tenantId, db) => {
      // 1. Asynchronously save message to PostgreSQL under tenant RLS context
      const messageInsert: Database["public"]["Tables"]["messages"]["Insert"] = {
        tenant_id: tenantId,
        channel_id: channelId,
        user_id: userId,
        content: content.trim(),
        media_urls: mediaUrls,
      };

      const messagesTable = db.from("messages");
      const { data: insertedMessage, error: insertError } = await (
        messagesTable.insert as unknown as (
          values: Database["public"]["Tables"]["messages"]["Insert"]
        ) => {
          select: () => {
            single: () => Promise<{ data: MessageRow | null; error: { message: string } | null }>;
          };
        }
      )(messageInsert)
        .select()
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to persist message", details: insertError.message },
          { status: 500 }
        );
      }

      const messagePayload: MessageRow = (insertedMessage as unknown as MessageRow) || {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        channel_id: channelId,
        user_id: userId,
        content: content.trim(),
        media_urls: mediaUrls,
        created_at: new Date().toISOString(),
      };

      // 2. Publish real-time payload to Upstash Redis isolated channel
      // Convention: tenant:{tenant_id}:channel:{channel_id}
      await publishTenantMessage(tenantId, channelId, messagePayload).catch(() => null);

      return NextResponse.json({
        success: true,
        message: messagePayload,
      });
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
