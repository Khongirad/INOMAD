'use client';

import * as React from 'react';
import { Coins, TrendingUp, PieChart, DollarSign, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface Investment {
  id: string;
  name: string;
  category: 'INFRASTRUCTURE' | 'TECHNOLOGY' | 'EDUCATION' | 'RESOURCE';
  amount: number;
  return: number;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
}

interface Transaction {
  id: string;
  date: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND';
  amount: number;
  description: string;
}

// Mock data
const mockInvestments: Investment[] = [
  { id: '1', name: 'Digital Infrastructure', category: 'INFRASTRUCTURE', amount: 500000, return: 12.5, status: 'ACTIVE' },
  { id: '2', name: 'AI Research Lab', category: 'TECHNOLOGY', amount: 350000, return: 18.3, status: 'ACTIVE' },
  { id: '3', name: 'Education Platform', category: 'EDUCATION', amount: 200000, return: 8.7, status: 'ACTIVE' },
  { id: '4', name: 'Resource Extraction', category: 'RESOURCE', amount: 750000, return: 15.2, status: 'PENDING' },
];

const mockTransactions: Transaction[] = [
  { id: '1', date: '2024-02-08', type: 'DEPOSIT', amount: 100000, description: 'UBI surplus allocation' },
  { id: '2', date: '2024-02-07', type: 'DIVIDEND', amount: 25000, description: 'Infrastructure project returns' },
  { id: '3', date: '2024-02-06', type: 'WITHDRAWAL', amount: 50000, description: 'Emergency relief fund' },
  { id: '4', date: '2024-02-05', type: 'DEPOSIT', amount: 150000, description: 'Tax revenue allocation' },
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'INFRASTRUCTURE': return 'text-blue-400 bg-blue-500/10';
    case 'TECHNOLOGY': return 'text-purple-400 bg-purple-500/10';
    case 'EDUCATION': return 'text-emerald-400 bg-emerald-500/10';
    case 'RESOURCE': return 'text-amber-400 bg-amber-500/10';
    default: return 'text-zinc-400 bg-zinc-500/10';
  }
};

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'DEPOSIT': return ArrowDownRight;
    case 'WITHDRAWAL': return ArrowUpRight;
    case 'DIVIDEND': return TrendingUp;
    default: return DollarSign;
  }
};

export default function FundPage() {
  const stats = {
    totalBalance: mockInvestments.reduce((sum, inv) => sum + inv.amount, 0),
    activeInvestments: mockInvestments.filter(inv => inv.status === 'ACTIVE').length,
    avgReturn: mockInvestments.reduce((sum, inv) => sum + inv.return, 0) / mockInvestments.length,
    totalDividends: mockTransactions
      .filter(t => t.type === 'DIVIDEND')
      .reduce((sum, t) => sum + t.amount, 0),
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Coins className="text-gold-primary w-8 h-8" />
            Resources & Sovereign Fund
          </h2>
          <p className="text-zinc-400 mt-1">
            State resource management and sovereign fund operations
          </p>
        </div>
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
                <div className="text-xs text-zinc-500 uppercase">Fund Balance</div>
                <div className="text-lg font-mono font-bold text-gold-primary">
                  {(stats.totalBalance / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <PieChart className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Active Investments</div>
                <div className="text-lg font-mono font-bold text-blue-500">
                  {stats.activeInvestments}
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
                <div className="text-xs text-zinc-500 uppercase">Avg Return</div>
                <div className="text-lg font-mono font-bold text-emerald-500">
                  {stats.avgReturn.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Total Dividends</div>
                <div className="text-lg font-mono font-bold text-white">
                  {(stats.totalDividends / 1000).toFixed(0)}K
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="investments" className="space-y-6">
        <TabsList className="bg-zinc-900/50 border border-white/5">
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
        </TabsList>

        <TabsContent value="investments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockInvestments.map((investment) => (
              <Card
                key={investment.id}
                className="border-white/5 bg-zinc-900/50 hover:border-gold-primary/30 transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base text-white">{investment.name}</CardTitle>
                      <span className={cn(
                        "text-xs font-bold uppercase px-2 py-0.5 rounded mt-1 inline-block",
                        getCategoryColor(investment.category)
                      )}>
                        {investment.category}
                      </span>
                    </div>
                    <div className={cn(
                      "text-xs font-bold uppercase px-2 py-1 rounded",
                      investment.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' :
                      investment.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-zinc-500/10 text-zinc-500'
                    )}>
                      {investment.status}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Investment</span>
                    <span className="font-mono text-gold-primary font-medium">
                      {investment.amount.toLocaleString()} ALT
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Return Rate</span>
                    <span className="font-mono text-emerald-500 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {investment.return.toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card className="border-white/5 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-base text-zinc-200">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockTransactions.map((transaction) => {
                const Icon = getTransactionIcon(transaction.type);
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-gold-primary/20 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        transaction.type === 'DEPOSIT' ? 'bg-emerald-500/10' :
                        transaction.type === 'WITHDRAWAL' ? 'bg-red-500/10' :
                        'bg-blue-500/10'
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          transaction.type === 'DEPOSIT' ? 'text-emerald-500' :
                          transaction.type === 'WITHDRAWAL' ? 'text-red-500' :
                          'text-blue-500'
                        )} />
                      </div>
                      <div>
                        <div className="font-medium text-white">{transaction.description}</div>
                        <div className="text-xs text-zinc-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      "font-mono font-bold text-lg",
                      transaction.type === 'DEPOSIT' ? 'text-emerald-500' :
                      transaction.type === 'WITHDRAWAL' ? 'text-red-500' :
                      'text-blue-500'
                    )}>
                      {transaction.type === 'WITHDRAWAL' ? '-' : '+'}
                      {transaction.amount.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <Card className="border-white/5 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-base text-zinc-200">Resource Allocation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {['INFRASTRUCTURE', 'TECHNOLOGY', 'EDUCATION', 'RESOURCE'].map((category) => {
                const total = mockInvestments
                  .filter(inv => inv.category === category)
                  .reduce((sum, inv) => sum + inv.amount, 0);
                const percentage = (total / stats.totalBalance) * 100;
                
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-zinc-300">{category}</span>
                      <span className="font-mono text-white">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          category === 'INFRASTRUCTURE' ? 'bg-blue-500' :
                          category === 'TECHNOLOGY' ? 'bg-purple-500' :
                          category === 'EDUCATION' ? 'bg-emerald-500' :
                          'bg-amber-500'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Banner */}
      <Card className="border-gold-border/20 bg-gold-surface/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-surface/20 flex-shrink-0">
              <Coins className="h-4 w-4 text-gold-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-gold-primary mb-1">Sovereign Fund Purpose</h4>
              <p className="text-sm text-zinc-300">
                The Sovereign Fund manages state resources and strategic investments to ensure
                long-term prosperity. Dividends are distributed to citizens through UBI and
                reinvested in critical infrastructure, technology, education, and resource development.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
