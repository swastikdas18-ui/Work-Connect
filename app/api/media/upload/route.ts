import { NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";

export async function POST(request: Request) {
  try {
    return await withTenantContext(request, async (tenantId, db) => {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Sanitize filename and enforce tenant path prefix
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileId = crypto.randomUUID();
      const storagePath = `${tenantId}/posts/${fileId}_${sanitizedName}`;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const { data, error } = await db.storage
        .from("community-media")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (error) {
        return NextResponse.json(
          { error: "Failed to upload file to storage", details: error.message },
          { status: 500 }
        );
      }

      const {
        data: { publicUrl },
      } = db.storage.from("community-media").getPublicUrl(storagePath);

      return NextResponse.json({
        success: true,
        path: data?.path || storagePath,
        publicUrl,
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

