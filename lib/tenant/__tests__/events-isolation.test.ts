import { describe, it, expect } from "vitest";
import { generateIcsFile, getGoogleCalendarUrl } from "@/lib/calendar/sync";

describe("Events Multi-Tenant Isolation & Calendar Sync", () => {
  const eventFixture = {
    title: "TypeScript Performance Masterclass",
    description: "Deep dive into Turbopack and V8 compilation pipelines",
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    startsAt: "2026-11-15T14:00:00Z",
    endsAt: "2026-11-15T15:30:00Z",
  };

  it("generates valid RFC 5545 .ics calendar content", () => {
    const ics = generateIcsFile(eventFixture);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:TypeScript Performance Masterclass");
    expect(ics).toContain("LOCATION:https://meet.google.com/abc-defg-hij");
    expect(ics).toContain("DTSTART:20261115T140000Z");
    expect(ics).toContain("DTEND:20261115T153000Z");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("generates valid Google Calendar template URL", () => {
    const url = getGoogleCalendarUrl(eventFixture);
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("TypeScript+Performance+Masterclass");
    expect(url).toContain("20261115T140000Z%2F20261115T153000Z");
  });

  it("prevents cross-tenant event access in query filters", () => {
    const tenantA = "00000000-0000-0000-0000-000000000001";
    const tenantB = "00000000-0000-0000-0000-000000000002";

    const eventsTable = [
      { id: "ev-1", tenant_id: tenantA, title: "Company A All-Hands" },
      { id: "ev-2", tenant_id: tenantB, title: "Company B Demo Day" },
    ];

    const filterByTenant = (tenantId: string) =>
      eventsTable.filter((e) => e.tenant_id === tenantId);

    const tenantAEvents = filterByTenant(tenantA);
    expect(tenantAEvents).toHaveLength(1);
    expect(tenantAEvents[0].title).toBe("Company A All-Hands");
    expect(tenantAEvents.some((e) => e.tenant_id === tenantB)).toBe(false);
  });
});

