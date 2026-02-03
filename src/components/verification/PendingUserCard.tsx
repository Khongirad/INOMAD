'use client';

import { useState } from 'react';
import { User, Check, X, AlertCircle } from 'lucide-react';

interface PendingUser {
  id: string;
  seatId: string;
  username: string;
  createdAt: string;
  constitutionAcceptedAt: string | null;
}

interface PendingUserCardProps {
  user: PendingUser;
  onVerify: (userId: string, notes?: string) => Promise<void>;
  disabled?: boolean;
}

export default function PendingUserCard({ user, onVerify, disabled }: PendingUserCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      await onVerify(user.id, notes);
      setShowConfirm(false);
      setNotes('');
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition">
      {/* User Info */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
          <User className="w-5 h-5 text-zinc-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{user.username}</h3>
          <p className="text-sm text-zinc-400">Seat ID: {user.seatId}</p>
          <p className="text-xs text-zinc-500 mt-1">
            Registered {daysSinceCreation} days ago
          </p>
        </div>
      </div>

      {/* Constitution Status */}
      {user.constitutionAcceptedAt ? (
        <div className="flex items-center gap-2 text-sm text-green-400 mb-3">
          <Check className="w-4 h-4" />
          Constitution accepted
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-yellow-400 mb-3">
          <AlertCircle className="w-4 h-4" />
          Constitution not accepted
        </div>
      )}

      {/* Actions */}
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={disabled}
          className="w-full px-4 py-2 bg-gold-primary text-black rounded-lg hover:bg-gold-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Verify User
        </button>
      ) : (
        <div className="space-y-3 p-3 bg-zinc-900/50 rounded border border-zinc-600">
          {/* Warning */}
          <div className="flex items-start gap-2 text-sm text-yellow-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              By verifying this user, you confirm their identity and grant them citizenship.
              This action is permanent and will use 1 of your 5 verification slots.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Verification Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How do you know this person?"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold-primary"
              rows={2}
            />
          </div>

          {/* Confirm Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleVerify}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
            >
              {loading ? 'Verifying...' : 'Confirm'}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setNotes('');
              }}
              disabled={loading}
              className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
