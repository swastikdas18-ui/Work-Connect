import { describe, it, expect } from "vitest";
import { getTenantChannelKey } from "../client";

describe("Redis Multi-Tenant Channel Isolation", () => {
  it("formats channel key according to tenant isolation convention", () => {
    const key = getTenantChannelKey("tenant-alpha", "general");
    expect(key).toBe("tenant:tenant-alpha:channel:general");
  });

  it("throws error if tenant_id is missing when generating key", () => {
    expect(() => getTenantChannelKey("", "general")).toThrow(
      "Cannot generate Redis key without a valid tenant_id"
    );
  });

  it("throws error if channel_id is missing when generating key", () => {
    expect(() => getTenantChannelKey("tenant-alpha", "")).toThrow(
      "Cannot generate Redis key without a valid channel_id"
    );
  });

  it("guarantees two different tenants generate different Redis channels for the same channel name", () => {
    const keyTenantA = getTenantChannelKey("tenant-A", "general");
    const keyTenantB = getTenantChannelKey("tenant-B", "general");

    expect(keyTenantA).not.toBe(keyTenantB);
    expect(keyTenantA).toBe("tenant:tenant-A:channel:general");
    expect(keyTenantB).toBe("tenant:tenant-B:channel:general");
  });
});
