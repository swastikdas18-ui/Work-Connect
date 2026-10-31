"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  ExternalLink,
  Download,
  CalendarPlus,
  Loader2,
  Check,
  X,
  Clock3,
} from "lucide-react";
import { CommunityEvent, EventType, EventAudience, RsvpStatus } from "@/types/database";
import { getGoogleCalendarUrl } from "@/lib/calendar/sync";

export interface EventCardProps {
  event: CommunityEvent & {
    organizer?: {
      id: string;
      full_name: string;
      email: string;
      role?: string;
    } | null;
    rsvps?: { status: RsvpStatus; user_id: string }[];
  };
  currentUserId?: string;
  tenantId?: string;
  onRsvpChange?: (eventId: string, newStatus: RsvpStatus | null) => void;
}

const TYPE_CONFIG: Record<
  EventType,
  { label: string; badgeClass: string; bgSoft: string }
> = {
  workshop: {
    label: "Workshop",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800",
    bgSoft: "from-indigo-500/10 to-transparent",
  },
  tech_talk: {
    label: "Tech Talk",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
    bgSoft: "from-purple-500/10 to-transparent",
  },
  demo_day: {
    label: "Demo Day",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    bgSoft: "from-amber-500/10 to-transparent",
  },
  office_hours: {
    label: "Office Hours",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    bgSoft: "from-emerald-500/10 to-transparent",
  },
  social: {
    label: "Social",
    badgeClass: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-800",
    bgSoft: "from-pink-500/10 to-transparent",
  },
};

const AUDIENCE_LABELS: Record<EventAudience, string> = {
  all: "All Members",
  employees_only: "Employees Only",
  interns_only: "Interns Only",
};

export function EventCard({
  event,
  currentUserId,
  tenantId,
  onRsvpChange,
}: EventCardProps) {
  // Determine current user's RSVP status
  const initialUserRsvp = React.useMemo(() => {
    if (!currentUserId || !event.rsvps) return null;
    const found = event.rsvps.find((r) => r.user_id === currentUserId);
    return found ? found.status : null;
  }, [currentUserId, event.rsvps]);

  const [rsvpStatus, setRsvpStatus] = React.useState<RsvpStatus | null>(initialUserRsvp);
  const [isUpdatingRsvp, setIsUpdatingRsvp] = React.useState(false);

  // Compute attending count
  const attendingCount = React.useMemo(() => {
    const baseCount = (event.rsvps || []).filter((r) => r.status === "attending").length;
    // Adjust optimistically if initial vs current changed
    if (initialUserRsvp === rsvpStatus) return baseCount;
    if (rsvpStatus === "attending" && initialUserRsvp !== "attending") return baseCount + 1;
    if (initialUserRsvp === "attending" && rsvpStatus !== "attending") return Math.max(0, baseCount - 1);
    return baseCount;
  }, [event.rsvps, initialUserRsvp, rsvpStatus]);

  const isFull = event.capacity ? attendingCount >= event.capacity : false;

  // Date formatting helpers using Intl.DateTimeFormat
  const { dateStr, timeStr } = React.useMemo(() => {
    try {
      const start = new Date(event.starts_at);
      const end = new Date(event.ends_at);

      const dateFmt = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      const timeFmt = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "numeric",
      });

      return {
        dateStr: dateFmt.format(start),
        timeStr: `${timeFmt.format(start)} – ${timeFmt.format(end)}`,
      };
    } catch {
      return { dateStr: event.starts_at, timeStr: `${event.starts_at} - ${event.ends_at}` };
    }
  }, [event.starts_at, event.ends_at]);

  const typeConfig = TYPE_CONFIG[event.event_type] || TYPE_CONFIG.workshop;

  const handleToggleRsvp = async (targetStatus: RsvpStatus) => {
    if (isUpdatingRsvp) return;

    const previousStatus = rsvpStatus;
    const nextStatus = previousStatus === targetStatus ? null : targetStatus;

    // Optimistic update
    setRsvpStatus(nextStatus);
    setIsUpdatingRsvp(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (tenantId) headers["x-tenant-id"] = tenantId;
      if (currentUserId) headers["x-user-id"] = currentUserId;

      const res = await fetch(`/api/events/${event.id}/rsvp`, {
        method: "POST",
        headers,
        body: JSON.stringify({ status: nextStatus || "declined" }),
      });

      if (!res.ok) {
        // Revert on error
        setRsvpStatus(previousStatus);
      } else {
        const data = await res.json();
        const serverStatus: RsvpStatus = data?.rsvp?.status || nextStatus;
        setRsvpStatus(serverStatus);
        onRsvpChange?.(event.id, serverStatus);
      }
    } catch {
      setRsvpStatus(previousStatus);
    } finally {
      setIsUpdatingRsvp(false);
    }
  };

  const googleCalUrl = React.useMemo(() => {
    return getGoogleCalendarUrl({
      title: event.title,
      description: event.description,
      location: event.location,
      meetingUrl: event.meeting_url,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
    });
  }, [event]);

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      {/* Top accent gradient bar */}
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${typeConfig.bgSoft}`}
      />

      <div>
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${typeConfig.badgeClass}`}
            >
              {typeConfig.label}
            </span>
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {AUDIENCE_LABELS[event.target_audience] || event.target_audience}
            </span>
          </div>

          {/* Capacity Counter */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Users className="h-3.5 w-3.5 text-zinc-400" />
            <span>
              {attendingCount}
              {event.capacity ? ` / ${event.capacity}` : " attending"}
            </span>
            {event.capacity && isFull && (
              <span className="rounded-sm bg-amber-100 px-1 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                Waitlist Active
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-zinc-900 group-hover:text-blue-600 transition dark:text-zinc-50 dark:group-hover:text-blue-400">
          {event.title}
        </h3>

        {/* Description */}
        <p className="mt-1.5 text-sm text-zinc-600 line-clamp-2 dark:text-zinc-400">
          {event.description}
        </p>

        {/* Date, Time & Location Information */}
        <div className="mt-4 space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{dateStr}</span>
            <span>•</span>
            <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span>{timeStr}</span>
          </div>

          {event.meeting_url && (
            <div className="flex items-center gap-2">
              <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <a
                href={event.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400 truncate max-w-[280px]"
              >
                <span>Join Virtual Call</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}

          {event.location && !event.meeting_url && (
            <div className="flex items-center gap-2 truncate">
              <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {event.organizer && (
            <div className="pt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              Hosted by <span className="text-zinc-600 dark:text-zinc-300 font-medium">{event.organizer.full_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        {/* RSVP Buttons */}
        <div className="flex items-center gap-2">
          {rsvpStatus === "attending" ? (
            <button
              onClick={() => handleToggleRsvp("declined")}
              disabled={isUpdatingRsvp}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition"
              aria-label="Decline RSVP"
            >
              {isUpdatingRsvp ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>Attending</span>
            </button>
          ) : rsvpStatus === "waitlisted" ? (
            <button
              onClick={() => handleToggleRsvp("declined")}
              disabled={isUpdatingRsvp}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 transition"
              aria-label="Leave waitlist"
            >
              {isUpdatingRsvp ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Clock3 className="h-3.5 w-3.5" />
              )}
              <span>Waitlisted</span>
            </button>
          ) : (
            <button
              onClick={() => handleToggleRsvp("attending")}
              disabled={isUpdatingRsvp}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-xs active:scale-95 disabled:opacity-50"
              aria-label="RSVP to event"
            >
              {isUpdatingRsvp ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isFull ? (
                <span>Join Waitlist</span>
              ) : (
                <span>RSVP</span>
              )}
            </button>
          )}

          {rsvpStatus && (
            <button
              onClick={() => handleToggleRsvp("declined")}
              disabled={isUpdatingRsvp}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 transition"
              title="Decline / Leave"
              aria-label="Decline event"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Calendar Sync Dropdown / Quick Links */}
        <div className="flex items-center gap-1">
          <a
            href={`/api/events/${event.id}/calendar`}
            download
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
            title="Download .ics Calendar Invite"
            aria-label="Download ICS file"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">.ICS</span>
          </a>

          <a
            href={googleCalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
            title="Add to Google Calendar"
            aria-label="Add to Google Calendar"
          >
            <CalendarPlus className="h-3.5 w-3.5 text-blue-500" />
            <span className="hidden sm:inline">Google</span>
          </a>
        </div>
      </div>
    </article>
  );
}

