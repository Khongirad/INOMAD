'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmbeddedWallet } from '@/lib/wallet/embedded';
import { signIn } from '@/lib/auth/sign-in';

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'pin' | 'signing'>('pin');

  const hasWallet = EmbeddedWallet.exists();

  const handleLogin = async () => {
    if (!pin) {
      setError('Enter your PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setStep('signing');
      await signIn(pin);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Authentication failed');
      setStep('pin');
    } finally {
      setLoading(false);
    }
  };

  if (!hasWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="w-full max-w-sm p-6 space-y-4">
          <h1 className="text-xl font-bold text-white text-center">INOMAD</h1>
          <p className="text-neutral-400 text-center text-sm">
            No wallet found. Register first to create your identity.
          </p>
          <a
            href="/register"
            className="block w-full py-2 px-4 bg-amber-600 text-white text-center rounded hover:bg-amber-700"
          >
            Register
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <div className="w-full max-w-sm p-6 space-y-4">
        <h1 className="text-xl font-bold text-white text-center">INOMAD</h1>
        <p className="text-neutral-400 text-center text-sm">
          {step === 'pin' && 'Unlock your wallet to sign in'}
          {step === 'signing' && 'Signing identity proof...'}
        </p>

        <div className="space-y-3">
          <input
            type="password"
            placeholder="Wallet PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            disabled={loading}
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none disabled:opacity-50"
          />

          <button
            onClick={handleLogin}
            disabled={loading || !pin}
            className="w-full py-2 px-4 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <p className="text-neutral-600 text-xs text-center">
          Your wallet signature proves SeatSBT ownership.
          No password is sent to the server.
        </p>
      </div>
    </div>
  );
}
