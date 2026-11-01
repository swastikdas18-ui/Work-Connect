import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";
import { MessageRow } from "@/types/database";

export interface ChannelMessageWithAuthor extends MessageRow {
  author?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  } | null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await context.params;

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    return await withTenantContext(req, async (tenantId, db) => {
      // 1. Query messages for the given channel & tenant
      const { data: rawMessages, error: messagesErr } = await db
        .from("messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (messagesErr) {
        return NextResponse.json(
          { messages: [], error: messagesErr.message },
          { status: 200 }
        );
      }

      const messages = (rawMessages || []) as unknown as MessageRow[];

      if (messages.length === 0) {
        return NextResponse.json({ messages: [] });
      }

      // 2. Fetch author profiles for all unique user_ids
      const userIds = Array.from(new Set(messages.map((m) => m.user_id)));
      
      const profileMap: Record<string, { id: string; full_name: string; avatar_url: string | null; role: string }> = {};

      try {
        const { data: rawProfiles } = await db
          .from("profiles")
          .select("id, full_name, avatar_url, role")
          .in("id", userIds);

        const profiles = (rawProfiles || []) as unknown as {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
        }[];

        for (const p of profiles) {
          profileMap[p.id] = {
            id: p.id,
            full_name: p.full_name || "Member",
            avatar_url: p.avatar_url || null,
            role: p.role || "intern",
          };
        }
      } catch {
        // Fallback gracefully
      }

      // If profiles was empty or errored, also check users table
      if (Object.keys(profileMap).length === 0) {
        try {
          const { data: rawUsers } = await db
            .from("users")
            .select("id, full_name, avatar_url, role")
            .in("id", userIds);

          const users = (rawUsers || []) as unknown as {
            id: string;
            full_name?: string | null;
            avatar_url?: string | null;
            role?: string | null;
          }[];

          for (const u of users) {
            profileMap[u.id] = {
              id: u.id,
              full_name: u.full_name || "Member",
              avatar_url: u.avatar_url || null,
              role: u.role || "intern",
            };
          }
        } catch {
          // ignore
        }
      }

      // 3. Attach author details to each message
      const messagesWithAuthor: ChannelMessageWithAuthor[] = messages.map((m) => ({
        ...m,
        author: profileMap[m.user_id] || {
          id: m.user_id,
          full_name: "Member",
          avatar_url: null,
          role: "intern",
        },
      }));

      return NextResponse.json({ messages: messagesWithAuthor });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ messages: [], error: message }, { status: 200 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await context.params;
    const body = await req.json();
    const { content, userId, mediaUrls = [] } = body;

    if (!channelId || !content || !content.trim() || !userId) {
      return NextResponse.json(
        { error: "channelId, userId, and non-empty content are required" },
        { status: 400 }
      );
    }

    return await withTenantContext(req, async (tenantId, db) => {
      const messageInsert = {
        tenant_id: tenantId,
        channel_id: channelId,
        user_id: userId,
        content: content.trim(),
        media_urls: mediaUrls,
      };

      const messagesTable = db.from("messages");
      const { data: insertedMessage, error: insertError } = await (
        messagesTable.insert as unknown as (values: typeof messageInsert) => {
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

      return NextResponse.json({ message: insertedMessage }, { status: 201 });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
