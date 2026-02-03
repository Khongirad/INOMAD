'use client';

import { useState } from 'react';
import { formatDualDate } from '@/lib/lunar-calendar';

interface NoteFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  selectedDate?: Date;
  initialData?: {
    title?: string;
    content: string;
    date: string;
    tags: string[];
    color?: string;
  };
}

const NOTE_COLORS = [
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Gray', value: '#6B7280' },
];

export function NoteForm({ onSubmit, onCancel, selectedDate, initialData }: NoteFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    date: initialData?.date || (selectedDate || new Date()).toISOString().slice(0, 10),
    tags: initialData?.tags?.join(', ') || '',
    color: initialData?.color || '#F59E0B',
  });

  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title (optional)
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder="e.g., Daily Reflection"
        />
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date *
        </label>
        <input
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
        {formData.date && (
          <p className="mt-1 text-xs text-gray-500">
            {formatDualDate(new Date(formData.date))}
          </p>
        )}
      </div>

      {/* Content */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Content (Markdown supported) *
          </label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs text-amber-600 hover:text-amber-800"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>

        {showPreview ? (
          <div className="w-full min-h-[200px] px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 prose prose-sm max-w-none">
            {formData.content || <span className="text-gray-400">No content to preview</span>}
          </div>
        ) : (
          <textarea
            required
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={10}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono text-sm"
            placeholder="Write your note here...

**Markdown** is supported:
- **Bold** and *italic*
- Lists and links
- # Headers"
          />
        )}
        <p className="mt-2 text-xs text-gray-500">
          Supports Markdown formatting
        </p>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder="e.g., personal, reflection, important"
        />
      </div>

      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Color
        </label>
        <div className="grid grid-cols-7 gap-2">
          {NOTE_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setFormData({ ...formData, color: color.value })}
              className={`w-full h-10 rounded-lg border-2 transition-all ${
                formData.color === color.value
                  ? 'border-gray-900 shadow-md scale-110'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
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
              : 'bg-amber-600 text-white hover:bg-amber-700'
          }`}
        >
          {submitting ? 'Saving...' : initialData ? 'Update Note' : 'Create Note'}
        </button>
      </div>
    </form>
  );
}
