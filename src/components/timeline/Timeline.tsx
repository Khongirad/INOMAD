'use client';

import TimelineItem from './TimelineItem';
import { Calendar } from 'lucide-react';

interface TimelineProps {
  events: any[];
  onEventClick?: (event: any) => void;
}

export default function Timeline({ events, onEventClick }: TimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No events yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-5 bottom-0 w-0.5 bg-zinc-700" />

      {/* Events */}
      <div className="relative">
        {events.map((event) => (
          <TimelineItem
            key={event.id}
            event={event}
            onClick={() => onEventClick?.(event)}
          />
        ))}
      </div>
    </div>
  );
}
