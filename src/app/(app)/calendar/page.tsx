'use client';

import { Calendar } from '@/components/calendar/Calendar';
import { EventForm } from '@/components/calendar/EventForm';
import { NoteForm } from '@/components/calendar/NoteForm';
import { useAuth } from '@/lib/hooks/use-auth';
import { useState, useEffect } from 'react';
import { formatDualDate } from '@/lib/lunar-calendar';

interface UpcomingEvent {
  id: string;
  title: string;
  startDate: string;
  category?: string;
  color?: string;
}

export default function CalendarPage() {
  const { user, token } = useAuth();
  const [showEventForm, setShowEventForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (token) {
      fetchUpcomingEvents();
    }
  }, [token]);

  const fetchUpcomingEvents = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendar/upcoming?days=7`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUpcomingEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch upcoming events:', err);
    }
  };

  const handleCreateEvent = async (data: any) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendar/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to create event');

      alert('✅ Event created successfully!');
      setShowEventForm(false);
      setRefreshKey(k => k + 1);
      fetchUpcomingEvents();
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : 'Failed to create event'}`);
    }
  };

  const handleCreateNote = async (data: any) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendar/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to create note');

      alert('✅ Note created successfully!');
      setShowNoteForm(false);
      setRefreshKey(k => k + 1);
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : 'Failed to create note'}`);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Please log in to access calendar</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            <p className="mt-2 text-gray-600">
              Manage your events and notes with dual calendar support 🌙
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNoteForm(true)}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
            >
              + Note
            </button>
            <button
              onClick={() => setShowEventForm(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + Event
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upcoming Events */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📅 Upcoming Events
              </h3>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No upcoming events
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="border-l-4 pl-3 py-2" style={{ borderColor: event.color || '#3B82F6' }}>
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDualDate(new Date(event.startDate))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                ⚡ Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowEventForm(true)}
                  className="w-full text-left px-3 py-2 text-sm bg-white hover:bg-gray-50 rounded-lg border border-gray-200"
                >
                  📅 New Event
                </button>
                <button
                  onClick={() => setShowNoteForm(true)}
                  className="w-full text-left px-3 py-2 text-sm bg-white hover:bg-gray-50 rounded-lg border border-gray-200"
                >
                  📝 New Note
                </button>
              </div>
            </div>
          </div>

          {/* Main Calendar */}
          <div className="lg:col-span-3">
            <Calendar key={refreshKey} />
          </div>
        </div>

        {/* Info Panels */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              📅 Gregorian Calendar
            </h3>
            <p className="text-sm text-blue-800">
              Standard international calendar with solar-based months.
              Events are displayed as colored dots on dates.
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-3">
              🌙 Lunar Calendar
            </h3>
            <p className="text-sm text-purple-800">
              Traditional Mongolian lunar calendar with moon phases and
              special dates like Цагаан сар (Lunar New Year).
            </p>
            <div className="mt-3 text-xs text-purple-700 space-y-1">
              <p>• 🌑 New Moon (Шинэ сар)</p>
              <p>• 🌕 Full Moon (Бүтэн сар)</p>
              <p>• Special cultural dates highlighted</p>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">
            💡 Quick Tips
          </h3>
          <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
            <li>Click any date to view or add events</li>
            <li>Toggle between Gregorian and Lunar views anytime</li>
            <li>Events are synced across both calendar types</li>
            <li>Use color coding to organize different event categories</li>
            <li>Set reminders for important events</li>
            <li>Notes support Markdown formatting</li>
          </ul>
        </div>
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Event</h2>
            <EventForm
              onSubmit={handleCreateEvent}
              onCancel={() => setShowEventForm(false)}
            />
          </div>
        </div>
      )}

      {/* Note Form Modal */}
      {showNoteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Note</h2>
            <NoteForm
              onSubmit={handleCreateNote}
              onCancel={() => setShowNoteForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
