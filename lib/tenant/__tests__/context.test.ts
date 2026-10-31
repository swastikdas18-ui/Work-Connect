import { describe, it, expect, vi } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import {
  extractTenantId,
  withTenantContext,
  TenantIsolationError,
} from "../context";

describe("Tenant Context Middleware & Isolation", () => {
  it("extracts tenant id from x-tenant-id header", () => {
    const req = new Request("http://localhost:3000/api/messages", {
      headers: {
        "x-tenant-id": "tenant-abc-123",
      },
    });

    const tenantId = extractTenantId(req);
    expect(tenantId).toBe("tenant-abc-123");
  });

  it("extracts tenant id from JWT Authorization Bearer header", () => {
    // Generate base64 mock JWT payload
    const payload = {
      sub: "user-123",
      tenant_id: "tenant-jwt-456",
      exp: 1999999999,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const fakeJwt = `header.${encodedPayload}.signature`;

    const req = new Request("http://localhost:3000/api/messages", {
      headers: {
        authorization: `Bearer ${fakeJwt}`,
      },
    });

    const tenantId = extractTenantId(req);
    expect(tenantId).toBe("tenant-jwt-456");
  });

  it("extracts tenant id from subdomain", () => {
    const req = new Request("https://team-delta.workconnect.app/api/channels");
    const tenantId = extractTenantId(req);
    expect(tenantId).toBe("team-delta");
  });

  it("throws TenantIsolationError when tenant context is completely missing", async () => {
    const req = new Request("http://localhost:3000/api/messages");
    const mockDb = {
      rpc: vi.fn(),
    } as unknown as SupabaseClient<Database>;

    await expect(
      withTenantContext(req, async () => {
        return "success";
      }, mockDb)
    ).rejects.toThrow(TenantIsolationError);
  });

  it("successfully passes validated tenantId to the handler when context is present", async () => {
    const req = new Request("http://localhost:3000/api/messages", {
      headers: {
        "x-tenant-id": "tenant-xyz-789",
      },
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as unknown as SupabaseClient<Database>;

    const result = await withTenantContext(
      req,
      async (tenantId) => {
        return `Handled tenant: ${tenantId}`;
      },
      mockDb
    );

    expect(result).toBe("Handled tenant: tenant-xyz-789");
  });
});
