'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';
import { Suspense } from 'react';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No recovery token found. Please restart the recovery process.');
    }
  }, [token]);

  // Live password strength checks
  const checks = {
    length: password.length >= 8,
    letters: /[a-zA-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    match: password === confirmPassword && password.length > 0,
  };
  const allPassed = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allPassed) {
      setError('Please satisfy all password requirements');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/recovery/reset-password', {
        recoveryToken: token,
        newPassword: password,
      });
      toast.success('Password reset successfully! All sessions have been revoked.');
      setDone(true);
    } catch (err: any) {
      const msg = err.message || 'Failed to reset password';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-8xl animate-bounce">✅</div>
          <h1 className="text-3xl font-bold text-green-400">Password Reset!</h1>
          <p className="text-zinc-400">
            Your password has been changed and all previous sessions have been invalidated for security.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-zinc-900 font-bold rounded-lg transition-colors"
          >
            Go to Login →
          </button>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:border-amber-500 focus:outline-none transition-colors text-white';

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-gold-primary mb-2">Set New Password</h1>
          <p className="text-zinc-400 text-sm">
            Your recovery has been approved. Set your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              required
              disabled={!token}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
              required
              disabled={!token}
            />
          </div>

          {/* Password requirements */}
          <div className="space-y-1.5 text-sm">
            {[
              { key: 'length', label: 'At least 8 characters' },
              { key: 'letters', label: 'Contains letters' },
              { key: 'numbers', label: 'Contains numbers' },
              { key: 'match', label: 'Passwords match' },
            ].map(({ key, label }) => (
              <div key={key} className={`flex items-center gap-2 ${checks[key as keyof typeof checks] ? 'text-green-400' : 'text-zinc-600'}`}>
                <span>{checks[key as keyof typeof checks] ? '✓' : '○'}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !allPassed || !token}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Resetting...' : '✅ Set New Password'}
          </button>

          <div className="text-center pt-2">
            <a href="/recovery" className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors">
              ← Start over with recovery
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-amber-400 animate-pulse">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
