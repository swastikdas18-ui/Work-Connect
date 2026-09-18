import React, { useState } from 'react';
import { Calendar, Clock, Video, User, Check, Users, Plus, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent } from '../types';

export function formatEventDate(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Date TBA";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

interface CalendarTabProps {
  events: CalendarEvent[];
  isAdminOrOwner: boolean;
  onRSVP: (eventId: string) => void;
  rsvpLoadingId?: string | null;
  onShowNotification: (message: string, type: 'success' | 'info') => void;
  onAddEvent: (title: string, description: string, startsAtIso: string, meetUrl: string) => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({
  events,
  isAdminOrOwner,
  onRSVP,
  rsvpLoadingId,
  onShowNotification,
  onAddEvent
}) => {
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDateTime, setEventDateTime] = useState('');
  const [eventUrl, setEventUrl] = useState('https://meet.google.com/abc-defg-hij');

  // Determine user's local timezone abbreviation
  const getLocalTimezone = () => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date());
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      return tzPart ? tzPart.value : 'PDT';
    } catch {
      return 'PDT';
    }
  };

  const tz = getLocalTimezone();

  const handleJoinCall = (title: string, url: string) => {
    onShowNotification(`Connecting to ${title} call...`, 'info');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCreateEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDesc.trim() || !eventDateTime.trim() || !eventUrl.trim()) {
      onShowNotification('Please fill out all fields.', 'info');
      return;
    }

    const selectedDate = new Date(eventDateTime);
    if (isNaN(selectedDate.getTime())) {
      onShowNotification('Invalid date selected.', 'info');
      return;
    }

    if (selectedDate < new Date()) {
      onShowNotification('Cannot schedule events in the past.', 'info');
      return;
    }

    onAddEvent(eventTitle, eventDesc, selectedDate.toISOString(), eventUrl);
    setEventTitle('');
    setEventDesc('');
    setEventDateTime('');
    setEventUrl('https://meet.google.com/abc-defg-hij');
    setShowAddEventModal(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="calendar-view">
      
      {/* Calendar Header Card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-6 shadow-sm dark:bg-zinc-950 dark:border-zinc-800 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 dark:bg-zinc-900 dark:text-indigo-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-50">Hub Schedule & Live Mixers</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Stay aligned with office hours, AMAs, milestone reviews, and celebrations.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-100 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 mr-2">
              <Clock className="h-3 w-3" />
              <span>Timezone: {tz} (Local Time)</span>
            </div>

            {isAdminOrOwner && (
              <button
                onClick={() => setShowAddEventModal(true)}
                className="bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all dark:bg-zinc-50 dark:hover:bg-zinc-250 dark:text-zinc-900 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Schedule Event</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Events Schedule Grid */}
      {events.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-400 dark:bg-zinc-950 dark:border-zinc-800 max-w-xl mx-auto">
          <Calendar className="h-10 w-10 text-zinc-300 mx-auto mb-4 animate-bounce" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No upcoming cohort events.</h3>
          <p className="text-xs text-zinc-400 mt-1 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Stay tuned for weekly office hours, tech AMAs, and demo day presentations.
          </p>

          {/* Action button inside empty state */}
          {isAdminOrOwner ? (
            <button
              onClick={() => setShowAddEventModal(true)}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule First Event</span>
            </button>
          ) : (
            <div className="mt-4 text-[10px] text-zinc-400">
              Ask your cohort's administrator to schedule the first session!
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {events.map((event) => (
            <div 
              key={event.id}
              className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm hover:border-zinc-300 transition-all flex flex-col justify-between dark:bg-zinc-950 dark:border-zinc-850"
            >
              <div>
                {/* Event Header Status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full dark:bg-zinc-900 dark:text-zinc-400">
                    {formatEventDate(event.date)}
                  </span>

                  {(event.is_rsvped ?? event.hasRSVPed) && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full dark:bg-emerald-950/40 dark:text-emerald-400">
                      <Check className="h-3 w-3" />
                      RSVP Registered
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-zinc-900 leading-snug dark:text-zinc-50 line-clamp-2">{event.title}</h3>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed line-clamp-3 dark:text-zinc-400">{event.description}</p>

                {/* Time and Host details */}
                <div className="mt-4 space-y-2 border-t border-zinc-50 pt-4 dark:border-zinc-850">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <Clock className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{event.time} ({tz})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <img 
                      src={event.host?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'} 
                      alt={event.host?.name || 'Organizer'} 
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Hosted by <strong className="font-bold">{event.host?.name || 'Organizer'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Event Footer Actions */}
              <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between gap-3 dark:border-zinc-850">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Users className="h-3.5 w-3.5" />
                  <span>{event.attendees_count ?? event.attendees} attending</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={rsvpLoadingId === event.id}
                    onClick={() => onRSVP(event.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      (event.is_rsvped ?? event.hasRSVPed)
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-850 dark:text-zinc-300'
                    } ${rsvpLoadingId === event.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {rsvpLoadingId === event.id ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (event.is_rsvped ?? event.hasRSVPed) ? (
                      'RSVPed ✓'
                    ) : (
                      'RSVP'
                    )}
                  </button>

                  <button
                    onClick={() => handleJoinCall(event.title, event.zoomUrl)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>Join Call</span>
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* SCHEDULE EVENT MODAL */}
      <AnimatePresence>
        {showAddEventModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddEventModal(false)}
              className="fixed inset-0 bg-black z-50"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50"
            >
              <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Calendar className="h-4.5 w-4.5 text-indigo-500" />
                  Schedule Cohort Event
                </h3>
                <button 
                  onClick={() => setShowAddEventModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <form onSubmit={handleCreateEventSubmit} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Event Title</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Weekly Tech AMA, Milestone Intern Demos"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Event Description</label>
                  <textarea 
                    rows={3}
                    required
                    placeholder="Provide details about speakers, presentation agendas, or dial-in parameters..."
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Event Date & Time</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={eventDateTime}
                    onChange={(e) => setEventDateTime(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Video Call URL</label>
                  <input 
                    type="url" 
                    required
                    placeholder="e.g. https://meet.google.com/abc-defg-hij"
                    value={eventUrl}
                    onChange={(e) => setEventUrl(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-880">
                  <button 
                    type="button"
                    onClick={() => setShowAddEventModal(false)}
                    className="text-xs font-bold border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl hover:bg-zinc-50 dark:border-zinc-750 dark:text-zinc-350"
                  >
                    Cancel
                  </button>

                  <button 
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition-all"
                  >
                    Publish Event
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
