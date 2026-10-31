export interface CalendarEventPayload {
  title: string;
  description: string;
  location?: string | null;
  meetingUrl?: string | null;
  startsAt: string | Date;
  endsAt: string | Date;
}

function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function generateIcsFile(event: CalendarEventPayload): string {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const dtStamp = formatDateToICS(new Date());
  const dtStart = formatDateToICS(start);
  const dtEnd = formatDateToICS(end);

  const loc = event.meetingUrl || event.location || "Virtual";
  const cleanDesc = (event.description || "").replace(/\n/g, "\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Work-Connect//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@work-connect.internal`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${cleanDesc}`,
    `LOCATION:${loc}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function getGoogleCalendarUrl(event: CalendarEventPayload): string {
  const start = formatDateToICS(new Date(event.startsAt));
  const end = formatDateToICS(new Date(event.endsAt));
  const loc = event.meetingUrl || event.location || "Virtual";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description,
    location: loc,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

