'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';

interface TimelineEvent {
  id: string;
  createdAt: string;
  type: string;
  scope: string;
  title: string;
  description?: string;
  location?: string;
  isLegalContract: boolean;
  actor?: {
    id: string;
    username: string;
    role: string;
  };
  target?: {
    id: string;
    username: string;
  };
  metadata?: any;
}

interface UserTimelineProps {
  userId?: string;
}

const EVENT_TYPE_ICONS: Record<string, string> = {
  ACCOUNT_CREATED: '🆕',
  IDENTITY_VERIFIED: '✅',
  CITIZENSHIP_GRANTED: '🏛️',
  CONTRACT_SIGNED: '📜',
  CONTRACT_COMPLETED: '✓',
  TASK_ASSIGNED: '📋',
  TASK_COMPLETED: '✔️',
  LOAN_APPROVED: '💰',
  VOTE_CAST: '🗳️',
  LAW_ENACTED: '⚖️',
  CUSTOM_EVENT: '📌',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  ACCOUNT_CREATED: 'bg-green-100 text-green-800 border-green-200',
  IDENTITY_VERIFIED: 'bg-blue-100 text-blue-800 border-blue-200',
  CITIZENSHIP_GRANTED: 'bg-purple-100 text-purple-800 border-purple-200',
  CONTRACT_SIGNED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  TASK_COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  VOTE_CAST: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  LAW_ENACTED: 'bg-red-100 text-red-800 border-red-200',
};

export function UserTimeline({ userId }: UserTimelineProps) {
  const { token, user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  const targetUserId = userId || user?.sub;

  useEffect(() => {
    if (targetUserId) {
      fetchTimeline();
    }
  }, [targetUserId]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/timeline/user/${targetUserId}?limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error('Failed to fetch timeline');

      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = filter
    ? events.filter(e => e.type.includes(filter.toUpperCase()))
    : events;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by event type..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={fetchTimeline}
          className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      {/* Timeline */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No events found</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          {/* Events */}
          <div className="space-y-4">
            {filteredEvents.map((event, index) => {
              const icon = EVENT_TYPE_ICONS[event.type] || '📌';
              const colorClass = EVENT_TYPE_COLORS[event.type] || 'bg-gray-100 text-gray-800 border-gray-200';

              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 w-12 h-12 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-xl z-10">
                    {icon}
                  </div>

                  {/* Event card */}
                  <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${colorClass}`}>
                            {event.type.replace(/_/g, ' ')}
                          </span>
                          {event.scope !== 'INDIVIDUAL' && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              {event.scope}
                            </span>
                          )}
                          {event.isLegalContract && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded border border-red-200">
                              ⚖️ Legal Contract
                            </span>
                          )}
                        </div>

                        <h4 className="font-semibold text-gray-900">{event.title}</h4>
                        
                        {event.description && (
                          <p className="mt-1 text-sm text-gray-600">{event.description}</p>
                        )}

                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                          <span>{new Date(event.createdAt).toLocaleString()}</span>
                          {event.actor && (
                            <span>by <strong>{event.actor.username}</strong></span>
                          )}
                          {event.target && event.target.id !== targetUserId && (
                            <span>→ <strong>{event.target.username}</strong></span>
                          )}
                          {event.location && (
                            <span>📍 {event.location}</span>
                          )}
                        </div>

                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                              View metadata
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
