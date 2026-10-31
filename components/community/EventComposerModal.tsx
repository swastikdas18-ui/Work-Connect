"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { X, Calendar, Clock, MapPin, Video, Users, AlertCircle, Loader2 } from "lucide-react";
import { EventAudience, EventType } from "@/types/database";

export interface EventComposerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  organizerId: string;
  onEventCreated?: () => void;
}

const EVENT_TYPES: { label: string; value: EventType }[] = [
  { label: "Workshop", value: "workshop" },
  { label: "Tech Talk", value: "tech_talk" },
  { label: "Demo Day", value: "demo_day" },
  { label: "Office Hours", value: "office_hours" },
  { label: "Social", value: "social" },
];

const AUDIENCES: { label: string; value: EventAudience }[] = [
  { label: "All Members", value: "all" },
  { label: "Employees Only", value: "employees_only" },
  { label: "Interns Only", value: "interns_only" },
];

function getDefaultTimes() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  const end = new Date(now.getTime() + 60 * 60 * 1000);

  const toLocalISO = (d: Date) => {
    const offset = d.getTimezoneOffset();
    const adjusted = new Date(d.getTime() - offset * 60000);
    return adjusted.toISOString().slice(0, 16);
  };

  return {
    start: toLocalISO(now),
    end: toLocalISO(end),
  };
}

export function EventComposerModal({
  open,
  onOpenChange,
  tenantId,
  organizerId,
  onEventCreated,
}: EventComposerModalProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [eventType, setEventType] = React.useState<EventType>("workshop");
  const [targetAudience, setTargetAudience] = React.useState<EventAudience>("all");
  const [startsAt, setStartsAt] = React.useState(() => getDefaultTimes().start);
  const [endsAt, setEndsAt] = React.useState(() => getDefaultTimes().end);
  const [meetingUrl, setMeetingUrl] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [capacity, setCapacity] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const resetForm = () => {
    const defaults = getDefaultTimes();
    setTitle("");
    setDescription("");
    setEventType("workshop");
    setTargetAudience("all");
    setStartsAt(defaults.start);
    setEndsAt(defaults.end);
    setMeetingUrl("");
    setLocation("");
    setCapacity("");
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || !description.trim() || !startsAt || !endsAt) {
      setErrorMessage("Please fill in all required fields (title, description, start and end times).");
      return;
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);

    if (endDate <= startDate) {
      setErrorMessage("End time must be strictly after the start time.");
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedCapacity = capacity ? parseInt(capacity, 10) : null;

      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
          "x-user-id": organizerId,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          event_type: eventType,
          target_audience: targetAudience,
          meeting_url: meetingUrl.trim() || null,
          location: location.trim() || null,
          starts_at: startDate.toISOString(),
          ends_at: endDate.toISOString(),
          capacity: parsedCapacity && parsedCapacity > 0 ? parsedCapacity : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data?.error || "Failed to create event. Make sure you have moderator/admin permissions.");
        return;
      }

      resetForm();
      onOpenChange(false);
      onEventCreated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[92dvh] flex-col rounded-t-[20px] border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 outline-none md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl md:rounded-2xl md:border">
          {/* Mobile Drag Handle */}
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700 md:hidden" />

          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 p-4 dark:border-zinc-800">
            <Drawer.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Schedule Event or Workshop
            </Drawer.Title>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close modal"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6 space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Event Category Selector */}
            <div>
              <label className="text-xs font-semibold text-zinc-600 uppercase dark:text-zinc-400">
                Category
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {EVENT_TYPES.map((type) => {
                  const isSelected = eventType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setEventType(type.value)}
                      className={`flex min-h-[36px] items-center rounded-full px-3 text-xs font-medium transition ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="text-xs font-semibold text-zinc-600 uppercase dark:text-zinc-400">
                Audience Scope
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {AUDIENCES.map((aud) => {
                  const isSelected = targetAudience === aud.value;
                  return (
                    <button
                      key={aud.value}
                      type="button"
                      onClick={() => setTargetAudience(aud.value)}
                      className={`flex min-h-[36px] items-center rounded-full px-3 text-xs font-medium transition ${
                        isSelected
                          ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {aud.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Next.js 16 Server Actions Deep Dive"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-blue-400"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What will be covered? Any prerequisites or agenda?"
                className="mt-1 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-blue-400"
              />
            </div>

            {/* Date and Time Row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Start Time</span> <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs sm:text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-blue-400"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  <span>End Time</span> <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs sm:text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-blue-400"
                />
              </div>
            </div>

            {/* Meeting URL or Location */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <Video className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Meeting Link (Optional)</span>
                </label>
                <input
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-blue-400"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Physical Location (Optional)</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Room 402, Headquarters"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-blue-400"
                />
              </div>
            </div>

            {/* Capacity */}
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <Users className="h-3.5 w-3.5 text-zinc-400" />
                <span>Max Capacity (Leave blank for unlimited)</span>
              </label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 30"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-blue-400"
              />
            </div>

            {/* Submit / Cancel Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="min-h-[44px] rounded-xl px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Publish Event</span>
              </button>
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

