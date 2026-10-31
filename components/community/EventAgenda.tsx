"use client";

import * as React from "react";
import { Plus, Calendar, Filter, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { CommunityEvent, RsvpStatus } from "@/types/database";
import { EventCard } from "./EventCard";
import { EventComposerModal } from "./EventComposerModal";

export interface EventAgendaProps {
  tenantId: string;
  currentUser: {
    id: string;
    role: string;
    name?: string;
  };
}

const CATEGORY_TABS: { label: string; value: string }[] = [
  { label: "All Events", value: "all" },
  { label: "Workshops", value: "workshop" },
  { label: "Tech Talks", value: "tech_talk" },
  { label: "Demo Days", value: "demo_day" },
  { label: "Office Hours", value: "office_hours" },
  { label: "Socials", value: "social" },
];

export function EventAgenda({ tenantId, currentUser }: EventAgendaProps) {
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [events, setEvents] = React.useState<
    (CommunityEvent & {
      organizer?: {
        id: string;
        full_name: string;
        email: string;
        role?: string;
      } | null;
      rsvps?: { status: RsvpStatus; user_id: string }[];
    })[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [composerOpen, setComposerOpen] = React.useState(false);

  const canCreateEvent = ["owner", "admin", "moderator"].includes(currentUser.role);

  const loadEvents = React.useCallback(async (typeFilter?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const url = new URL("/api/events", window.location.origin);
      if (typeFilter && typeFilter !== "all") {
        url.searchParams.set("type", typeFilter);
      }

      const res = await fetch(url.toString(), {
        headers: {
          "x-tenant-id": tenantId,
          "x-user-id": currentUser.id,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load events (${res.status})`);
      }

      const data = await res.json();
      setEvents(data.events || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching events.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, currentUser.id]);

  React.useEffect(() => {
    let ignore = false;
    async function init() {
      if (!ignore) {
        await loadEvents(activeCategory);
      }
    }
    void init();
    return () => {
      ignore = true;
    };
  }, [loadEvents, activeCategory]);

  const handleCategorySelect = (categoryValue: string) => {
    setActiveCategory(categoryValue);
  };

  const handleRsvpChange = (eventId: string, newStatus: RsvpStatus | null) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        const filteredRsvps = (ev.rsvps || []).filter((r) => r.user_id !== currentUser.id);
        const updatedRsvps = newStatus
          ? [...filteredRsvps, { user_id: currentUser.id, status: newStatus }]
          : filteredRsvps;
        return {
          ...ev,
          rsvps: updatedRsvps,
        };
      })
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header and Action Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Calendar className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Events & Workshops
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Interactive sessions, demos, mentoring office hours, and team meetups.
          </p>
        </div>

        {canCreateEvent && (
          <button
            onClick={() => setComposerOpen(true)}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
            aria-label="Create new event"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Event</span>
          </button>
        )}
      </div>

      {/* Category Filter Pills (Horizontal Scrollable on Mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none sm:pb-0">
        <Filter className="h-4 w-4 text-zinc-400 shrink-0 ml-1 mr-0.5 hidden sm:block" />
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeCategory === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => handleCategorySelect(tab.value)}
              className={`inline-flex min-h-[38px] shrink-0 items-center rounded-full px-3.5 text-xs font-medium transition ${
                isActive
                  ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => loadEvents(activeCategory)}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200/60 bg-white p-5 animate-pulse dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-16 rounded-md bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="h-6 w-3/4 rounded-md bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-12 w-full rounded-md bg-zinc-100 dark:bg-zinc-800/60" />
              <div className="mt-2 h-4 w-1/2 rounded-md bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-4 flex justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <div className="h-9 w-20 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-9 w-20 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/50 p-10 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            No events scheduled yet
          </h3>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            {activeCategory === "all"
              ? "There are no upcoming events or workshops on the calendar right now."
              : `There are currently no events under the "${activeCategory}" filter.`}
          </p>
          {canCreateEvent && (
            <button
              onClick={() => setComposerOpen(true)}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule First Event</span>
            </button>
          )}
        </div>
      )}

      {/* Grid of Event Cards */}
      {!isLoading && events.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              currentUserId={currentUser.id}
              tenantId={tenantId}
              onRsvpChange={handleRsvpChange}
            />
          ))}
        </div>
      )}

      {/* Event Composer Bottom Sheet */}
      {canCreateEvent && (
        <EventComposerModal
          open={composerOpen}
          onOpenChange={setComposerOpen}
          tenantId={tenantId}
          organizerId={currentUser.id}
          onEventCreated={() => loadEvents(activeCategory)}
        />
      )}
    </div>
  );
}

