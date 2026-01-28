/**
 * WalletBalance - Privacy-first wallet component
 * Balance is HIDDEN by default, tap to reveal
 */

'use client';

import { useState } from 'react';
import { useWalletBalance } from '@/lib/hooks/useWalletBalance';
import { formatAltan } from '@/lib/api/sovereign-fund';
import { Wallet, Eye, EyeOff, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface WalletBalanceProps {
  userId: string | null;
  autoHideDelay?: number; // Auto-hide after N milliseconds (0 = never)
}

export function WalletBalance({ userId, autoHideDelay = 0 }: WalletBalanceProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const { eligibility, hasReceived, isLoading, error } = useWalletBalance(userId);

  // Auto-hide after delay
  useState(() => {
    if (isRevealed && autoHideDelay > 0) {
      const timeoutId = setTimeout(() => {
        setIsRevealed(false);
      }, autoHideDelay);
      return () => clearTimeout(timeoutId);
    }
  });

  if (isLoading) {
    return <WalletBalanceSkeleton />;
  }

  if (error || !userId) {
    return null;
  }

  // Determine balance based on distribution status
  const balance = hasReceived ? '17241.00' : '0.00'; // TODO: fetch actual balance from blockchain
  const isVerified = eligibility?.eligible || hasReceived;

  const toggleReveal = () => {
    setIsRevealed(!isRevealed);
  };

  return (
    <div className="group relative rounded-2xl bg-gradient-to-br from-emerald-950/90 via-teal-950/90 to-cyan-950/90 backdrop-blur-xl border border-emerald-500/20 shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-emerald-500/20">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Glowing border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700" />

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                ALTAN Wallet
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Your personal balance
            </p>
          </div>
          {isVerified && (
            <VerificationBadge status={hasReceived ? 'received' : 'verified'} />
          )}
        </div>

        {/* Balance Display - Privacy First */}
        <button
          onClick={toggleReveal}
          className="w-full group/reveal focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-xl transition-all"
          aria-label={isRevealed ? 'Hide balance' : 'Reveal balance'}
        >
          <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-6 transition-all duration-300 group-hover/reveal:border-emerald-500/40">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-xs text-slate-400 uppercase tracking-wide">
                  Balance
                </p>
                <div className="text-4xl font-bold">
                  {isRevealed ? (
                    <span className="bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 bg-clip-text text-transparent animate-in fade-in duration-300">
                      {formatAltan(balance)}
                    </span>
                  ) : (
                    <span className="text-slate-600 select-none">
                      ••••• ₳
                    </span>
                  )}
                </div>
              </div>
              
              {/* Reveal Icon */}
              <div className="ml-4 p-3 rounded-full bg-emerald-500/10 group-hover/reveal:bg-emerald-500/20 transition-colors">
                {isRevealed ? (
                  <EyeOff className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Eye className="w-6 h-6 text-emerald-400" />
                )}
              </div>
            </div>

            {/* Tap to Reveal Hint */}
            {!isRevealed && (
              <div className="mt-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400/70">
                  Tap to reveal balance
                </span>
              </div>
            )}
          </div>
        </button>

        {/* Distribution Status */}
        {isVerified && (
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 space-y-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide">
              Distribution Status
            </p>
            
            {hasReceived ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Received 17,241.00 ₳
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-400">
                <Clock className="w-5 h-5 animate-pulse" />
                <span className="text-sm font-medium">
                  Pending distribution
                </span>
              </div>
            )}
          </div>
        )}

        {/* Not Verified Status */}
        {!isVerified && (
          <div className="rounded-xl bg-slate-800/50 border border-amber-500/30 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-400">
                  Not Verified
                </p>
                <p className="text-xs text-slate-400">
                  Complete verification to receive your initial ALTAN distribution
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 text-center">
            Privacy-first design • Your balance is private
          </p>
        </div>
      </div>
    </div>
  );
}

function VerificationBadge({ status }: { status: 'verified' | 'received' }) {
  if (status === 'received') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-xs font-medium text-emerald-300">
          Active
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <span className="text-xs font-medium text-amber-300">
        Verified
      </span>
    </div>
  );
}

function WalletBalanceSkeleton() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-6 space-y-6 animate-pulse">
      <div className="h-6 bg-slate-700/50 rounded w-2/3" />
      <div className="h-32 bg-slate-700/30 rounded-xl" />
      <div className="h-20 bg-slate-700/30 rounded-xl" />
    </div>
  );
}
