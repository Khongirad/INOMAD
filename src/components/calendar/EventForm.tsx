'use client';

import { useState } from 'react';
import { formatDualDate } from '@/lib/lunar-calendar';

interface EventFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  initialData?: {
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    allDay: boolean;
    location?: string;
    category?: string;
    color?: string;
    reminderMinutes?: number;
  };
}

const CATEGORIES = [
  { value: 'WORK', label: '🏢 Work', color: '#3B82F6' },
  { value: 'PERSONAL', label: '👤 Personal', color: '#10B981' },
  { value: 'KHURAL', label: '🏛️ Khural', color: '#8B5CF6' },
  { value: 'MEETING', label: '🤝 Meeting', color: '#EF4444' },
  { value: 'EDUCATION', label: '📚 Education', color: '#6366F1' },
  { value: 'EVENT', label: '🎉 Event', color: '#EC4899' },
  { value: 'OTHER', label: '📌 Other', color: '#6B7280' },
];

const REMINDER_OPTIONS = [
  { value: 0, label: 'No reminder' },
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

export function EventForm({ onSubmit, onCancel, initialData }: EventFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    startDate: initialData?.startDate || new Date().toISOString().slice(0, 16),
    endDate: initialData?.endDate || '',
    allDay: initialData?.allDay || false,
    location: initialData?.location || '',
    category: initialData?.category || 'PERSONAL',
    color: initialData?.color || '#3B82F6',
    reminderMinutes: initialData?.reminderMinutes ?? 0,
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        tags: formData.category ? [formData.category] : [],
        reminderMinutes: formData.reminderMinutes > 0 ? formData.reminderMinutes : null,
        endDate: formData.endDate || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.value === formData.category);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Event Title *
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Team Meeting"
        />
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date & Time *
          </label>
          <input
            type={formData.allDay ? 'date' : 'datetime-local'}
            required
            value={formData.allDay ? formData.startDate.slice(0, 10) : formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {formData.startDate && (
            <p className="mt-1 text-xs text-gray-500">
              {formatDualDate(new Date(formData.startDate))}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date & Time
          </label>
          <input
            type={formData.allDay ? 'date' : 'datetime-local'}
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* All Day Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="allDay"
          checked={formData.allDay}
          onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="allDay" className="text-sm text-gray-700">
          All day event
        </label>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Add details about the event..."
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Location
        </label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Office, Online, etc."
        />
      </div>

      {/* Category and Color */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => {
              const cat = CATEGORIES.find(c => c.value === e.target.value);
              setFormData({ 
                ...formData, 
                category: e.target.value,
                color: cat?.color || formData.color
              });
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <div
              className="flex-1 h-10 rounded border border-gray-300"
              style={{ backgroundColor: formData.color }}
            ></div>
          </div>
        </div>
      </div>

      {/* Reminder */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reminder
        </label>
        <select
          value={formData.reminderMinutes}
          onChange={(e) => setFormData({ ...formData, reminderMinutes: parseInt(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {REMINDER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            submitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {submitting ? 'Saving...' : initialData ? 'Update Event' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}
