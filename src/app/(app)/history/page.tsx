'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { HistoricalRecordForm } from '@/components/history/HistoricalRecordForm';
import { useRouter } from 'next/navigation';
import { getUserNarratives, createHistoricalRecord, HistoricalRecord } from '@/lib/api';
import { toast } from 'sonner';

export default function HistoryPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [myRecords, setMyRecords] = useState<HistoricalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyRecords();
    }
  }, [user]);

  const fetchMyRecords = async () => {
    try {
      setLoading(true);
      const data = await getUserNarratives();
      setMyRecords(data);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch records';
      console.error('Failed to fetch records:', err);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = async (data: any) => {
    try {
      await createHistoricalRecord(data);
      toast.success('✅ Historical record created successfully!');
      setShowForm(false);
      fetchMyRecords();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create record';
      toast.error(`❌ ${errorMsg}`);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Please log in to manage historical records</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Historical Records</h1>
            <p className="mt-2 text-gray-600">
              Document the history of INOMAD KHURAL through narratives
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            {showForm ? 'Cancel' : '+ New Record'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Historical Record</h2>
            <HistoricalRecordForm onSubmit={handleCreateRecord} />
          </div>
        )}

        {/* My Records */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            My Records ({myRecords.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : myRecords.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No historical records yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Create your first record
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myRecords.map((record) => (
                <div
                  key={record.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{record.title}</h3>
                        {record.isPublished ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            ✓ Published
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                            ✏️ Draft
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>Period:</strong> {new Date(record.periodStart).toLocaleDateString()}
                          {record.periodEnd && ` - ${new Date(record.periodEnd).toLocaleDateString()}`}
                        </p>
                        <p>
                          <strong>Scope:</strong> {record.scope}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created {new Date(record.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/history/${record.id}`)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                      {!record.isPublished && (
                        <button
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-purple-900 mb-2">
            📜 About Historical Records
          </h3>
          <div className="text-xs text-purple-800 space-y-1">
            <p>
              • Historical records document significant events and periods in INOMAD KHURAL's history
            </p>
            <p>
              • Records can be written at any hierarchical level (individual, family, clan, arban, etc.)
            </p>
            <p>
              • All records must be reviewed and published by an admin before becoming official
            </p>
            <p>
              • Published records are immutable and form part of the permanent historical archive
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
