'use client';

import { PendingVerifications } from '@/components/verification/PendingVerifications';
import { VerificationStats } from '@/components/verification/VerificationStats';
import { VerificationChain } from '@/components/verification/VerificationChain';
import { useAuth } from '@/lib/hooks/use-auth';

export default function VerificationDashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Please log in to access verification dashboard</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Verification Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage identity verifications and build the chain of trust
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats and Chain */}
          <div className="lg:col-span-1 space-y-6">
            <VerificationStats />
            
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Chain</h3>
              <VerificationChain userId={user.sub} username={user.username} />
            </div>
          </div>

          {/* Right Column - Pending Verifications */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <PendingVerifications />
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            📋 How Verification Works
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>1. Chain of Trust:</strong> Each verification creates a link in the chain, 
              connecting users back to verified admins and ultimately to the Creator.
            </p>
            <p>
              <strong>2. Quota System:</strong> Regular users can verify up to 5 others. 
              Admins have unlimited verifications.
            </p>
            <p>
              <strong>3. Legal Record:</strong> All verifications are permanently recorded 
              with timestamps, IP addresses, and form part of the legal timeline.
            </p>
            <p>
              <strong>4. Prerequisites:</strong> Users must accept the Constitution before 
              they can be verified.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
