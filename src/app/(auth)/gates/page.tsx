'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function GatesOfKhuralPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/login-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
      }

      // Redirect based on role
      if (data.user.role === 'CREATOR') {
        router.push('/creator/admins');
      } else if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to enter the Khural');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/baikal-gates.png"
          alt="Gates of Khural"
          fill
          className="object-cover opacity-60"
          priority
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 z-1">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Title */}
        <div className="text-center mb-12 animate-fadeIn">
          <h1 className="text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-gold-primary to-amber-600 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)] font-serif tracking-wider">
            ВРАТА ХУРАЛА
          </h1>
          <h2 className="text-2xl font-light text-amber-400/80 tracking-[0.3em] uppercase">
            Gates of Khural
          </h2>
          <p className="text-zinc-400 mt-4 text-sm">
            Enter the sovereign digital realm
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6 animate-slideUp">
          {/* Username Field */}
          <div className="relative">
            <label className="block text-sm font-medium text-amber-400/90 mb-2 tracking-wide uppercase">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-6 py-4 bg-black/40 backdrop-blur-sm border-2 border-amber-900/50 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300"
              placeholder="Enter your username"
              required
              disabled={loading}
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <label className="block text-sm font-medium text-amber-400/90 mb-2 tracking-wide uppercase">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-black/40 backdrop-blur-sm border-2 border-amber-900/50 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300"
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400 text-sm animate-shake">
              ⚠️ {error}
            </div>
          )}

          {/* Enter Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-amber-600 via-gold-primary to-amber-600 hover:from-amber-500 hover:via-gold-secondary hover:to-amber-500 text-zinc-900 font-bold text-lg rounded-lg shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Entering...
              </span>
            ) : (
              '⚔️ ENTER THE KHURAL ⚔️'
            )}
          </button>

          {/* Register Link */}
          <div className="text-center pt-4">
            <p className="text-zinc-500 text-sm mb-2">
              New to the Khural?
            </p>
            <button
              type="button"
              onClick={() => router.push('/gates/register')}
              className="text-amber-400 hover:text-amber-300 font-medium transition-colors underline"
            >
              Create Your Seat
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-12 text-center text-zinc-600 text-xs">
          <p>INOMAD KHURAL • Sovereign Digital State</p>
          <p className="mt-1">Gateway to Lake Baikal Sacred Territory</p>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-100px) translateX(50px);
            opacity: 0.8;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .animate-float {
          animation: float infinite ease-in-out;
        }

        .animate-fadeIn {
          animation: fadeIn 1s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.8s ease-out 0.3s both;
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
