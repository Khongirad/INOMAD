'use client';

import { UserTimeline } from '@/components/timeline/UserTimeline';
import { useAuth } from '@/lib/hooks/use-auth';

export default function TimelinePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Please log in to view your timeline</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Timeline</h1>
          <p className="mt-2 text-gray-600">
            A permanent legal record of all your activities in INOMAD KHURAL
          </p>
        </div>

        {/* Timeline */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <UserTimeline />
        </div>

        {/* Info */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">
            ⚠️ Legal Timeline
          </h3>
          <p className="text-xs text-yellow-800">
            All events recorded here are permanent legal records with timestamps, 
            locations, and cryptographic hashes (where applicable). These records 
            form the basis of legal contracts, citizenship verification, and governance 
            participation.
          </p>
        </div>
      </div>
    </div>
  );
}
