'use client';

import * as React from 'react';
import { Coins, TrendingUp, PieChart, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import type { FundInvestment, FundTransaction, FundStats } from '@/lib/types/models';

// Direct hooks for sovereign fund (no separate API wrapper needed for Phase 2)
const useFundStats = () =>
  useQuery<FundStats>({
    queryKey: ['fundStats'],
    queryFn: () => api.get<FundStats>('/sovereign-fund/stats'),
  });

const useFundInvestments = () =>
  useQuery<FundInvestment[]>({
    queryKey: ['fundInvestments'],
    queryFn: () => api.get<FundInvestment[]>('/sovereign-fund/investments'),
  });

const useFundTransactions = () =>
  useQuery<FundTransaction[]>({
    queryKey: ['fundTransactions'],
    queryFn: () => api.get<FundTransaction[]>('/sovereign-fund/transactions'),
  });

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'INFRASTRUCTURE': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'TECHNOLOGY': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'EDUCATION': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'RESOURCE': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  }
};

const CATEGORY_LABELS: Record<string, string> = {
  INFRASTRUCTURE: 'Инфраstructure',
  TECHNOLOGY: 'Технологии',
  EDUCATION: 'Education',
  RESOURCE: 'Resources',
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'text-emerald-500 bg-emerald-500/10';
    case 'PENDING': return 'text-amber-500 bg-amber-500/10';
    case 'MATURED': return 'text-blue-500 bg-blue-500/10';
    default: return 'text-zinc-400 bg-zinc-500/10';
  }
};

const TXN_LABELS: Record<string, { label: string; cls: string }> = {
  DEPOSIT: { label: 'Bygenderнение', cls: 'text-emerald-400' },
  WITHDRAWAL: { label: 'Withdrawal', cls: 'text-rose-400' },
  DIVIDEND: { label: 'Dividend', cls: 'text-blue-400' },
  REINVEST: { label: 'Реинвестиция', cls: 'text-purple-400' },
};

export default function FundPage() {
  const { data: stats } = useFundStats();
  const { data: investments = [], isLoading: loadingInv } = useFundInvestments();
  const { data: transactions = [], isLoading: loadingTxn } = useFundTransactions();

  const defaultStats = stats || {
    totalBalance: 0,
    activeInvestments: 0,
    avgReturn: 0,
    totalDividends: 0,
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
          <Coins className="text-gold-primary w-8 h-8" />
          Sovereign Fund
        </h2>
        <p className="text-zinc-400 mt-1">
          Governance национальным богатством и инвестициями Конфедерации
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-gold-border/30 bg-gradient-to-br from-zinc-900/80 to-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-surface/20">
                <Wallet className="h-5 w-5 text-gold-primary" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Balance</div>
                <div className="text-lg font-mono font-bold text-white">
                  {(defaultStats.totalBalance / 1000).toFixed(0)}K ₳
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <PieChart className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Инвестиций</div>
                <div className="text-lg font-mono font-bold text-purple-500">
                  {defaultStats.activeInvestments}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Средняя incomeность</div>
                <div className="text-lg font-mono font-bold text-emerald-500">
                  {defaultStats.avgReturn.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Dividends</div>
                <div className="text-lg font-mono font-bold text-white">
                  {(defaultStats.totalDividends / 1000).toFixed(0)}K ₳
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="investments" className="space-y-6">
        <TabsList className="bg-zinc-900/50 border border-white/5">
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="transactions">Транзакции</TabsTrigger>
        </TabsList>

        {/* Investments */}
        <TabsContent value="investments" className="space-y-4">
          {loadingInv ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : investments.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <PieChart className="h-12 w-12 mx-auto opacity-30 mb-2" />
              Инвестиций нет
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {investments.map((inv: FundInvestment) => (
                <Card key={inv.id} className="border-white/5 bg-zinc-900/50 hover:border-white/10 transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base text-white">{inv.name}</CardTitle>
                      <span className={cn(
                        "text-xs font-bold uppercase px-2 py-1 rounded",
                        getStatusColor(inv.status)
                      )}>
                        {inv.status === 'ACTIVE' ? 'Activа' : inv.status === 'PENDING' ? 'Ожидание' : 'Completed'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Сектор</span>
                      <span className={cn(
                        "text-xs font-bold uppercase px-2 py-0.5 rounded border",
                        getCategoryColor(inv.sector)
                      )}>
                        {CATEGORY_LABELS[inv.sector] || inv.sector}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Amount</span>
                      <span className="font-mono text-white">
                        {(inv.amount / 1000).toFixed(0)}K ₳
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Incomeность</span>
                      <span className={cn("font-mono", inv.return >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                        {inv.return >= 0 ? '+' : ''}{inv.return.toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Transactions */}
        <TabsContent value="transactions" className="space-y-4">
          {loadingTxn ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              Транзакций нет
            </div>
          ) : (
            <Card className="border-white/5 bg-zinc-900/30">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-white/5">
                      <tr>
                        {['Date', 'Type', 'Amount', 'Description'].map((h) => (
                          <th key={h} className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.map((txn: FundTransaction) => {
                        const info = TXN_LABELS[txn.type] || { label: txn.type, cls: 'text-zinc-400' };
                        const isPositive = ['DEPOSIT', 'DIVIDEND', 'REINVEST'].includes(txn.type);
                        return (
                          <tr key={txn.id} className="hover:bg-zinc-800/50 transition-colors">
                            <td className="px-6 py-4 text-sm text-zinc-400">
                              {new Date(txn.createdAt).toLocaleDateString('en-US')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                {isPositive ? (
                                  <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3 text-rose-400" />
                                )}
                                <span className={cn('text-xs font-semibold', info.cls)}>
                                  {info.label}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn('font-mono text-sm', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
                                {isPositive ? '+' : '−'}{(txn.amount / 1000).toFixed(1)}K ₳
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-300">
                              {txn.description}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Info */}
      <Card className="border-gold-border/20 bg-gradient-to-r from-amber-950/10 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-surface/20 flex-shrink-0">
              <Coins className="h-4 w-4 text-gold-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-200 mb-1">О Суверенном fundе</h4>
              <p className="text-sm text-amber-100/70">
                Sovereign Fund инвестирует taxовые поступления и UBI-излишки in инфраструктуру,
                технологии, education и resources. Dividends are distributed among citizenми.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
