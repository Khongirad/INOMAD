'use client';

import { MapPin, Clock, FileText } from 'lucide-react';
import EventIcon, { type EventType } from './EventIcon';

interface TimelineItemProps {
  event: {
    id: string;
    type: EventType;
    title: string;
    description?: string;
    location?: string;
    createdAt: string;
    isLegalContract: boolean;
    contractHash?: string;
    actor?: {
      id: string;
      username: string;
    };
    target?: {
      id: string;
      username: string;
    };
  };
  onClick?: () => void;
}

export default function TimelineItem({ event, onClick }: TimelineItemProps) {
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`flex gap-4 pb-6 ${
        onClick ? 'cursor-pointer hover:opacity-80 transition' : ''
      }`}
      onClick={onClick}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <EventIcon type={event.type} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h3 className="text-white font-medium mb-1">{event.title}</h3>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-zinc-400 mb-2">{event.description}</p>
        )}

        {/* Contract Badge */}
        {event.isLegalContract && (
          <div className="inline-flex items-center gap-2 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400 mb-2">
            <FileText className="w-3 h-3" />
            Legal Contract
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          {/* Time */}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(event.createdAt)}
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {event.location}
            </div>
          )}

          {/* Participants */}
          {event.actor && (
            <span className="text-zinc-400">
              by <span className="text-white">{event.actor.username}</span>
            </span>
          )}
          {event.target && (
            <span className="text-zinc-400">
              → <span className="text-white">{event.target.username}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
