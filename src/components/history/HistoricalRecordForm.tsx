'use client';

import { useState } from 'react';

interface HistoricalRecordFormProps {
  onSubmit: (data: any) => Promise<void>;
  initialData?: {
    title: string;
    narrative: string;
    periodStart: string;
    periodEnd?: string;
    scope: string;
    scopeId: string;
  };
}

const SCOPES = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'CLAN', label: 'Clan' },
  { value: 'ARBAD', label: 'Arbad' },
  { value: 'HORDE', label: 'Horde' },
  { value: 'NATION', label: 'Nation' },
  { value: 'CONFEDERATION', label: 'Confederation' },
];

export function HistoricalRecordForm({ onSubmit, initialData }: HistoricalRecordFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    narrative: initialData?.narrative || '',
    periodStart: initialData?.periodStart || new Date().toISOString().split('T')[0],
    periodEnd: initialData?.periodEnd || '',
    scope: initialData?.scope || 'INDIVIDUAL',
    scopeId: initialData?.scopeId || '',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        periodStart: new Date(formData.periodStart).toISOString(),
        periodEnd: formData.periodEnd ? new Date(formData.periodEnd).toISOString() : undefined,
        eventIds: [], // Related events can be linked after record is published
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
          Title *
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., The founding of Arbad Alpha"
        />
      </div>

      {/* Period */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Period Start *
          </label>
          <input
            type="date"
            required
            value={formData.periodStart}
            onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Period End (optional)
          </label>
          <input
            type="date"
            value={formData.periodEnd}
            onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Scope */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scope *
          </label>
          <select
            required
            value={formData.scope}
            onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {SCOPES.map(scope => (
              <option key={scope.value} value={scope.value}>
                {scope.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scope ID *
          </label>
          <input
            type="text"
            required
            value={formData.scopeId}
            onChange={(e) => setFormData({ ...formData, scopeId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="ID of the entity (user, clan, arbad, etc.)"
          />
        </div>
      </div>

      {/* Narrative */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Narrative (Markdown) *
        </label>
        <textarea
          required
          value={formData.narrative}
          onChange={(e) => setFormData({ ...formData, narrative: e.target.value })}
          rows={12}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          placeholder="# The Story Begins...

Write your historical narrative here in Markdown format.

## Key Events
- Event 1
- Event 2

Use proper formatting for a professional historical record."
        />
        <p className="mt-2 text-xs text-gray-500">
          Supports Markdown formatting (headers, lists, bold, italic, links, etc.)
        </p>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={submitting}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            submitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {submitting ? 'Saving...' : initialData ? 'Update Record' : 'Create Record'}
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Records are created as drafts and must be reviewed and 
          published by an admin before they become part of the official historical record.
        </p>
      </div>
    </form>
  );
}
