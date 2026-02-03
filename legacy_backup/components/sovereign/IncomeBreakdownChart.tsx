/**
 * IncomeBreakdownChart - Visual income source distribution
 * Shows percentage breakdown of fund income sources
 */

'use client';

import type { IncomeBreakdown } from '@/lib/api/sovereign-fund';
import { TrendingUp, DollarSign, Factory, Landmark, TrendingDown, Heart } from 'lucide-react';

interface IncomeBreakdownChartProps {
  incomeBreakdown: IncomeBreakdown[];
  totalReceived: string;
}

const SOURCE_ICONS: Record<string, any> = {
  'INITIAL_DISTRIBUTION': DollarSign,
  'RESOURCE_PROFITS': TrendingUp,
  'FACTORY_DIVIDENDS': Factory,
  'TAX_REVENUE': Landmark,
  'INVESTMENT_RETURNS': TrendingDown,
  'DONATIONS': Heart,
};

const SOURCE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'INITIAL_DISTRIBUTION': { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-300' },
  'RESOURCE_PROFITS': { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-300' },
  'FACTORY_DIVIDENDS': { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-300' },
  'TAX_REVENUE': { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-300' },
  'INVESTMENT_RETURNS': { bg: 'bg-pink-500/20', border: 'border-pink-500/40', text: 'text-pink-300' },
  'DONATIONS': { bg: 'bg-rose-500/20', border: 'border-rose-500/40', text: 'text-rose-300' },
};

export function IncomeBreakdownChart({ incomeBreakdown, totalReceived }: IncomeBreakdownChartProps) {
  const total = parseFloat(totalReceived || '0');
  
  // Filter out zero amounts and calculate percentages
  const items = incomeBreakdown
    .map(item => ({
      ...item,
      amount: parseFloat(item.amount || '0'),
    }))
    .filter(item => item.amount > 0)
    .map(item => ({
      ...item,
      percentage: total > 0 ? (item.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/50 backdrop-blur border border-slate-700/50 p-6">
        <p className="text-slate-400 text-center">No income data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-200">
            Income Sources
          </h3>
          <p className="text-xs text-slate-400">
            Fund revenue breakdown by category
          </p>
        </div>

        {/* Bar Chart */}
        <div className="space-y-3">
          {items.map((item, index) => {
            const Icon = SOURCE_ICONS[item.source] || DollarSign;
            const colors = SOURCE_COLORS[item.source] || SOURCE_COLORS['INITIAL_DISTRIBUTION'];
            const formattedSource = item.source.replace(/_/g, ' ');
            
            return (
              <div key={index} className="space-y-2">
                {/* Label */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                    <span className="text-slate-300 capitalize">
                      {formattedSource.toLowerCase()}
                    </span>
                  </div>
                  <span className={`font-semibold ${colors.text}`}>
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="relative h-3 rounded-full bg-slate-800/50 overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${colors.bg} border ${colors.border} transition-all duration-1000 ease-out`}
                    style={{ width: `${item.percentage}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                  </div>
                </div>
                
                {/* Amount */}
                <div className="text-xs text-slate-500">
                  {formatAmount(item.amount)} ₳
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Total Income</span>
            <span className="font-semibold text-slate-200">
              {formatAmount(total)} ₳
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatAmount(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  } else if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
