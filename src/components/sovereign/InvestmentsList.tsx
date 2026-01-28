/**
 * InvestmentsList - Active fund investments
 * Shows current infrastructure and project investments
 */

'use client';

import type { Investment } from '@/lib/api/sovereign-fund';
import { Landmark, Building2, TrendingUp, Calendar, ExternalLink } from 'lucide-react';

interface InvestmentsListProps {
  investments: Investment[];
}

export function InvestmentsList({ investments }: InvestmentsListProps) {
  if (investments.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/50 backdrop-blur border border-slate-700/50 p-8">
        <div className="text-center space-y-2">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-slate-400">No active investments</p>
          <p className="text-xs text-slate-500">
            Fund investments will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-200">
              Active Investments
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Current fund allocations in infrastructure and projects
          </p>
        </div>

        {/* Investments Grid */}
        <div className="space-y-4">
          {investments.map((investment) => (
            <InvestmentCard key={investment.id} investment={investment} />
          ))}
        </div>

        {/* Total Invested */}
        <div className="pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Total Invested</span>
            <span className="text-lg font-semibold text-purple-300">
              {formatAmount(
                investments.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0)
              )} ₳
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvestmentCard({ investment }: { investment: Investment }) {
  const amount = parseFloat(investment.amount || '0');
  const date = new Date(investment.timestamp);

  return (
    <div className="group relative rounded-xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 p-4 hover:border-purple-500/40 transition-all">
      {/* Investment Name */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <h4 className="text-base font-semibold text-slate-200">
              {investment.name}
            </h4>
            {investment.description && (
              <p className="text-sm text-slate-400 line-clamp-2">
                {investment.description}
              </p>
            )}
          </div>
          
          {/* Active Badge */}
          {investment.active && (
            <div className="flex-shrink-0 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-xs font-medium text-purple-300">Active</span>
              </div>
            </div>
          )}
        </div>

        {/* Investment Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Amount */}
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Amount</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <p className="text-lg font-semibold text-purple-300">
                {formatAmount(amount)} ₳
              </p>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Invested</p>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-300">
                {date.toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Beneficiary */}
        {investment.beneficiary && (
          <div className="pt-3 border-t border-slate-700/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Beneficiary</span>
              <a
                href={`#address-${investment.beneficiary}`}
                className="group/link flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors"
              >
                <span className="font-mono">
                  {investment.beneficiary.slice(0, 6)}...{investment.beneficiary.slice(-4)}
                </span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatAmount(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
