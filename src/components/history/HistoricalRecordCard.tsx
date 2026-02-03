'use client';

import { Calendar, MapPin, User, Eye } from 'lucide-react';

interface HistoricalRecordCardProps {
  record: {
    id: string;
    title: string;
    periodStart: string;
    periodEnd?: string;
    scope: string;
    isPublished: boolean;
    author: {
      id: string;
      username: string;
    };
    eventIds: string[];
  };
  onClick?: () => void;
}

export default function HistoricalRecordCard({ record, onClick }: HistoricalRecordCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const scopeColors: Record<string, string> = {
    INDIVIDUAL: 'bg-purple-500/20 text-purple-400',
    FAMILY: 'bg-blue-500/20 text-blue-400',
    CLAN: 'bg-green-500/20 text-green-400',
    ARBAN: 'bg-yellow-500/20 text-yellow-400',
    HORDE: 'bg-red-500/20 text-red-400',
    NATION: 'bg-pink-500/20 text-pink-400',
    CONFEDERATION: 'bg-gold-primary/20 text-gold-primary',
  };

  return (
    <div
      className={`bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-white flex-1">{record.title}</h3>
        <div className="flex items-center gap-2">
          {/* Scope Badge */}
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            scopeColors[record.scope] || 'bg-zinc-600/20 text-zinc-400'
          }`}>
            {record.scope}
          </span>
          {/* Published Badge */}
          {record.isPublished && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
              Published
            </span>
          )}
        </div>
      </div>

      {/* Period */}
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
        <Calendar className="w-4 h-4" />
        <span>
          {formatDate(record.periodStart)}
          {record.periodEnd && ` — ${formatDate(record.periodEnd)}`}
        </span>
      </div>

      {/* Author */}
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
        <User className="w-4 h-4" />
        <span>by {record.author.username}</span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {record.eventIds.length} events linked
        </div>
      </div>
    </div>
  );
}
