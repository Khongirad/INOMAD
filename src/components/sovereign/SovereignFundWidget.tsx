/**
 * SovereignFundWidget - Public transparency widget
 * Shows real-time pension fund balance and statistics
 */

'use client';

import { useSovereignFund } from '@/lib/hooks/useSovereignFund';
import { formatAltan, formatLargeNumber } from '@/lib/api/sovereign-fund';
import { TrendingUp, PiggyBank, BarChart3, Activity } from 'lucide-react';

export function SovereignFundWidget() {
  const { data, isLoading, error } = useSovereignFund();

  if (isLoading) {
    return <SovereignFundSkeleton />;
  }

  if (error || !data?.stats) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-6">
        <p className="text-slate-400">Failed to load fund data</p>
      </div>
    );
  }

  const stats = data.stats;
  const balance = parseFloat(stats.balance || '0');
  const totalReceived = parseFloat(stats.totalReceived || '0');
  const totalInvested = parseFloat(stats.totalInvested || '0');

  // Calculate per-citizen share (assuming 145,000 citizens)
  const CITIZEN_COUNT = 145000;
  const perCitizen = balance / CITIZEN_COUNT;

  // Calculate percentage invested
  const investedPercentage = totalReceived > 0 
    ? ((totalInvested / totalReceived) * 100).toFixed(1)
    : '0';

  return (
    <div className="group relative rounded-2xl bg-gradient-to-br from-blue-950/90 via-indigo-950/90 to-violet-950/90 backdrop-blur-xl border border-blue-500/20 shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-blue-500/20">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Glowing border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700" />

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                Суверенный Фонд Благосостояния
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Transparent pension fund for all citizens
            </p>
          </div>
          <Activity className="w-5 h-5 text-green-400 animate-pulse" />
        </div>

        {/* Main Balance */}
        <div className="space-y-2">
          <div className="text-4xl font-bold bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
            {formatLargeNumber(balance)} ₳
          </div>
          <div className="text-sm text-slate-400">
            Total Fund Balance
          </div>
        </div>

        {/* Per-Citizen Share */}
        <div className="rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                Per Citizen
              </p>
              <p className="text-2xl font-semibold text-blue-200">
                {formatAltan(perCitizen)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-400/50" />
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Received */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-400" />
              <p className="text-xs text-slate-400">Total Received</p>
            </div>
            <p className="text-lg font-semibold text-slate-200">
              {formatLargeNumber(totalReceived)} ₳
            </p>
          </div>

          {/* Total Invested */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <p className="text-xs text-slate-400">Invested</p>
            </div>
            <p className="text-lg font-semibold text-slate-200">
              {investedPercentage}%
            </p>
          </div>
        </div>

        {/* Active Investments Badge */}
        {stats.activeInvestments > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-sm text-purple-200">
              {stats.activeInvestments} active investment{stats.activeInvestments !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Income Sources Preview */}
        {data.incomeBreakdown.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 uppercase tracking-wide">
              Income Sources
            </p>
            <div className="space-y-1">
              {data.incomeBreakdown.slice(0, 3).map((income, index) => {
                const amount = parseFloat(income.amount || '0');
                const percentage = totalReceived > 0 
                  ? ((amount / totalReceived) * 100).toFixed(1)
                  : '0';
                
                return (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{income.source.replace(/_/g, ' ')}</span>
                    <span className="text-slate-300 font-medium">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 text-center">
            Updated in real-time • Public blockchain transparency
          </p>
        </div>
      </div>
    </div>
  );
}

function SovereignFundSkeleton() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-6 space-y-6 animate-pulse">
      <div className="h-6 bg-slate-700/50 rounded w-3/4" />
      <div className="h-12 bg-slate-700/50 rounded w-1/2" />
      <div className="h-24 bg-slate-700/30 rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-20 bg-slate-700/30 rounded-xl" />
        <div className="h-20 bg-slate-700/30 rounded-xl" />
      </div>
    </div>
  );
}
