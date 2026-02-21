'use client';

import * as React from 'react';
import { ArrowRightLeft, TrendingUp, TrendingDown, Coins, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ExchangeRate {
  pair: string;
  rate: number;
  change24h: number;
  volume24h: number;
}

interface TradeHistory {
  id: string;
  time: string;
  pair: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  total: number;
}

// Mock data
const mockRates: ExchangeRate[] = [
  { pair: 'ALT/USD', rate: 1.0234, change24h: 2.45, volume24h: 125000 },
  { pair: 'ALT/EUR', rate: 0.9456, change24h: -0.82, volume24h: 89000 },
  { pair: 'ALT/RUB', rate: 94.56, change24h: 1.23, volume24h: 234000 },
  { pair: 'ALT/CNY', rate: 7.32, change24h: 0.56, volume24h: 156000 },
];

const mockHistory: TradeHistory[] = [
  { id: '1', time: '2024-02-08 14:23:45', pair: 'ALT/USD', type: 'BUY', amount: 100, price: 1.0234, total: 102.34 },
  { id: '2', time: '2024-02-08 14:22:12', pair: 'ALT/EUR', type: 'SELL', amount: 50, price: 0.9456, total: 47.28 },
  { id: '3', time: '2024-02-08 14:20:33', pair: 'ALT/RUB', type: 'BUY', amount: 200, price: 94.56, total: 18912 },
  { id: '4', time: '2024-02-08 14:18:09', pair: 'ALT/USD', type: 'BUY', amount: 75, price: 1.0230, total: 76.73 },
];

export default function ExchangePage() {
  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <ArrowRightLeft className="text-blue-500 w-8 h-8" />
            Auctions & Exchange
          </h2>
          <p className="text-zinc-400 mt-1">
            Market pricing mechanisms and resource distribution systems
          </p>
        </div>
      </div>

      {/* Exchange Rates Banner */}
      <Card className="border-gold-border/20 bg-gradient-to-r from-zinc-900/60 to-zinc-900/40">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {mockRates.map((rate) => (
              <div key={rate.pair} className="text-center">
                <div className="text-xs text-zinc-500 uppercase mb-1">{rate.pair}</div>
                <div className="text-2xl font-mono font-bold text-white mb-1">
                  {rate.rate.toFixed(4)}
                </div>
                <div className={cn(
                  "flex items-center justify-center gap-1 text-sm font-medium",
                  rate.change24h >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {rate.change24h >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(rate.change24h).toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="rates" className="space-y-6">
        <TabsList className="bg-zinc-900/50 border border-white/5">
          <TabsTrigger value="rates">Exchange Rates</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
          <TabsTrigger value="auctions">Auctions</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mockRates.map((rate) => (
              <Card key={rate.pair} className="border-white/5 bg-zinc-900/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-gold-primary" />
                      {rate.pair}
                    </span>
                    <span className={cn(
                      "text-sm font-medium px-3 py-1 rounded-full",
                      rate.change24h >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {rate.change24h >= 0 ? '+' : ''}{rate.change24h.toFixed(2)}%
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Current Rate</span>
                    <span className="font-mono text-xl font-bold text-white">
                      {rate.rate.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">24h Volume</span>
                    <span className="font-mono text-zinc-300">
                      {rate.volume24h.toLocaleString()} ALT
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="border-white/5 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-base text-zinc-200">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Pair</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Price</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mockHistory.map((trade) => (
                      <tr key={trade.id} className="hover:bg-zinc-800/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <Clock className="h-3 w-3" />
                            {trade.time}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="font-medium text-white">{trade.pair}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={cn(
                            "text-xs font-bold uppercase px-2 py-1 rounded",
                            trade.type === 'BUY' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                          )}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className="font-mono text-white">{trade.amount.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className="font-mono text-zinc-300">{trade.price.toFixed(4)}</span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className="font-mono font-medium text-gold-primary">
                            {trade.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auctions" className="space-y-4">
          <Card className="border-white/5 bg-zinc-900/30">
            <CardContent className="p-8">
              <div className="flex items-center justify-center h-64 text-center">
                <div>
                  <DollarSign className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Auction System Coming Soon
                  </h3>
                  <p className="text-zinc-400 max-w-md">
                    Resource auctions, land bidding, and cooperative asset
                    distribution mechanisms will be available here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Banner */}
      <Card className="border-amber-500/20 bg-amber-950/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 flex-shrink-0">
              <ArrowRightLeft className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-200 mb-1">Market Information</h4>
              <p className="text-sm text-amber-100/70">
                Exchange rates are updated in real-time. All trades are settled on-chain
                with full transparency. The official rate is set by the Central Bank,
                while market rates reflect supply and demand.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
