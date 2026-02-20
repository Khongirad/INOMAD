'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/use-auth';
import { api } from '@/lib/api/client';

type Mode = 'choose' | 'enter-guarantor' | 'share-seat';

interface GuarantorInfo {
  username: string;
  seatId: string;
  verifiedAt?: string;
}

export default function ActivationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('choose');
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState(false);

  // Guarantor input
  const [guarantorSeatId, setGuarantorSeatId] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [guarantorInfo, setGuarantorInfo] = useState<GuarantorInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const seatId = user?.seatId || 'Loading...';

  // Poll for verification status
  const checkVerification = useCallback(async () => {
    if (verified) return;
    setChecking(true);
    try {
      const profile = await api.get<{ verifiedAt?: string | null }>('/users/me');
      if (profile?.verifiedAt) {
        setVerified(true);
        // Fetch guarantor info
        try {
          const data = await api.get<{ guarantor: GuarantorInfo | null }>('/verification/my-guarantor');
          if (data?.guarantor) setGuarantorInfo(data.guarantor);
        } catch { /* ok */ }
        toast.success('🎉 You have been verified by a citizen!');
        setTimeout(() => router.push('/profile/create'), 3000);
      }
    } catch {
      // Silently fail
    } finally {
      setChecking(false);
    }
  }, [verified, router]);

  // Auto-poll every 10 seconds
  useEffect(() => {
    checkVerification();
    const interval = setInterval(checkVerification, 10000);
    return () => clearInterval(interval);
  }, [checkVerification]);

  const copySeatId = () => {
    navigator.clipboard.writeText(seatId);
    setCopied(true);
    toast.success('Seat ID copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestVerification = async () => {
    if (!guarantorSeatId.trim()) {
      setError('Please enter your guarantor\'s Seat ID');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await api.post<{ ok: boolean; guarantor: { username: string; seatId: string }; message: string }>(
        '/verification/request-by-seat',
        { guarantorSeatId: guarantorSeatId.trim() },
      );
      setRequestSent(true);
      setGuarantorInfo(result.guarantor);
      toast.success(`Request sent to ${result.guarantor.username}!`);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification request');
      toast.error(err.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Verified State ───

  if (verified) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="text-8xl animate-bounce">✅</div>
          <h1 className="text-3xl font-bold text-green-400">Verification Complete!</h1>
          {guarantorInfo && (
            <div className="bg-zinc-900 border border-green-600/30 rounded-xl p-6">
              <p className="text-zinc-400 text-sm mb-1">Verified by your Guarantor</p>
              <p className="text-2xl font-bold text-amber-400">@{guarantorInfo.username}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {guarantorInfo.seatId} • Your guarantor bears responsibility for your identity
              </p>
            </div>
          )}
          <p className="text-zinc-400">
            Redirecting you to create your digital identity...
          </p>
          <div className="animate-pulse text-amber-400">Redirecting...</div>
        </div>
      </div>
    );
  }

  // ─── Choose Mode ───

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-gold-primary mb-2">Account Activation</h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            To activate your account, you need a <span className="text-amber-400 font-semibold">guarantor</span> —
            a verified citizen who vouches for your identity.
          </p>
        </div>

        {/* Responsibility Notice */}
        <div className="bg-amber-950/20 border border-amber-600/30 rounded-xl p-6 mb-8">
          <p className="text-amber-200 font-semibold mb-2">⚖️ Chain of Responsibility</p>
          <p className="text-zinc-300 text-sm">
            Verification is not a formality — it is a bond of trust.
            The citizen who verifies you is <span className="text-amber-400 font-semibold">personally responsible</span> for
            vouching for your identity. This ensures that every member of the Khural
            is interconnected and accountable. Without activation, you cannot proceed further.
          </p>
        </div>

        {/* ─── Mode: Choose ─── */}
        {mode === 'choose' && (
          <div className="grid gap-4 mb-8">
            <button
              onClick={() => setMode('enter-guarantor')}
              className="bg-zinc-900 border-2 border-amber-500/40 rounded-xl p-6 text-left hover:border-amber-500/70 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">🤝</div>
                <div>
                  <p className="text-lg font-semibold text-amber-400 group-hover:text-amber-300">
                    I know a verified citizen
                  </p>
                  <p className="text-sm text-zinc-400">
                    Enter their Seat ID to send a verification request
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('share-seat')}
              className="bg-zinc-900 border-2 border-zinc-700 rounded-xl p-6 text-left hover:border-zinc-500 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">📤</div>
                <div>
                  <p className="text-lg font-semibold text-zinc-200 group-hover:text-zinc-100">
                    I need to find a guarantor
                  </p>
                  <p className="text-sm text-zinc-400">
                    Share your Seat ID with a verified citizen so they can verify you
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ─── Mode: Enter Guarantor SeatID ─── */}
        {mode === 'enter-guarantor' && (
          <div className="space-y-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => { setMode('choose'); setError(''); setRequestSent(false); }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
                ← Back
              </button>
            </div>

            {!requestSent ? (
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8">
                <h3 className="text-lg font-semibold text-amber-400 mb-4">🤝 Enter Guarantor&apos;s Seat ID</h3>
                <p className="text-sm text-zinc-400 mb-6">
                  Ask your guarantor for their Seat ID. They can find it on their profile or dashboard.
                </p>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={guarantorSeatId}
                    onChange={(e) => setGuarantorSeatId(e.target.value.toUpperCase())}
                    placeholder="SEAT-XXXXX"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg font-mono text-lg tracking-wider text-center focus:border-amber-500 focus:outline-none transition-colors"
                  />
                  {error && (
                    <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleRequestVerification}
                    disabled={submitting}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-zinc-900 font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Sending...' : 'Send Verification Request'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 border-2 border-green-600/30 rounded-xl p-8 text-center">
                <div className="text-5xl mb-4">📨</div>
                <h3 className="text-xl font-bold text-green-400 mb-2">Request Sent!</h3>
                {guarantorInfo && (
                  <div className="mb-4">
                    <p className="text-zinc-400 text-sm">Your guarantor</p>
                    <p className="text-2xl font-bold text-amber-400">@{guarantorInfo.username}</p>
                    <p className="text-xs text-zinc-500 mt-1">{guarantorInfo.seatId}</p>
                  </div>
                )}
                <p className="text-zinc-400 text-sm mb-4">
                  Ask <span className="text-amber-400 font-semibold">@{guarantorInfo?.username}</span> to open their
                  Verification Dashboard and verify your account. This page will update automatically.
                </p>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Your Seat ID (share if needed)</p>
                  <p className="text-lg font-mono font-bold text-amber-400">{seatId}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Mode: Share Seat ID ─── */}
        {mode === 'share-seat' && (
          <div className="space-y-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setMode('choose')}
                className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
                ← Back
              </button>
            </div>

            <div className="bg-zinc-900 border-2 border-amber-500/40 rounded-xl p-8 text-center">
              <p className="text-sm text-zinc-400 mb-2">Your Seat ID</p>
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-3xl font-mono font-bold text-amber-400 tracking-wider">
                  {seatId}
                </span>
                <button
                  onClick={copySeatId}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
                >
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <p className="text-zinc-400 text-sm">
                Share this ID with a verified citizen. They can verify you from their
                <span className="text-amber-400"> Verification Dashboard</span>.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h4 className="font-medium text-zinc-200 mb-3">How to find a guarantor:</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex gap-2">
                  <span className="text-amber-400">1.</span>
                  Contact a verified citizen you know personally
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">2.</span>
                  Share your Seat ID with them
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">3.</span>
                  They verify you from their Verification Dashboard
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">4.</span>
                  This page updates automatically when verified
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Status indicator */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className={`w-3 h-3 rounded-full ${checking ? 'bg-amber-500 animate-pulse' : 'bg-zinc-600'}`} />
            <span className="text-sm text-zinc-400">
              {checking ? 'Checking verification status...' : 'Waiting for verification'}
            </span>
          </div>
          <p className="text-xs text-zinc-600">
            Auto-checking every 10 seconds
          </p>
          <button
            onClick={checkVerification}
            className="mt-3 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
          >
            Check Now
          </button>
        </div>
      </div>
    </div>
  );
}
