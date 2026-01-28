/**
 * Enhanced Citizen Dashboard
 * Complete financial overview with all widgets
 */

import { SovereignFundWidget } from '@/components/sovereign/SovereignFundWidget';
import { IncomeBreakdownChart } from '@/components/sovereign/IncomeBreakdownChart';
import { InvestmentsList } from '@/components/sovereign/InvestmentsList';
import { WalletBalance } from '@/components/wallet/WalletBalance';
import { TransactionHistory } from '@/components/wallet/TransactionHistory';

export default function DashboardPage() {
  // TODO: Get actual userId from authentication
  const userId = 'demo-user-123';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
            Citizen Dashboard
          </h1>
          <p className="text-slate-400">
            Your complete financial overview of the Siberian Confederation
          </p>
        </div>

        {/* Top Row - Main Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wallet Balance - Privacy First */}
          <WalletBalance userId={userId} autoHideDelay={10000} />

          {/* Sovereign Fund - Public Transparency */}
          <SovereignFundWidget />
        </div>

        {/* Second Row - Detailed Views */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Breakdown Chart */}
          <IncomeBreakdownChart 
            incomeBreakdown={[
              { source: 'INITIAL_DISTRIBUTION', sourceId: 0, amount: '827590000000.00' },
              { source: 'RESOURCE_PROFITS', sourceId: 1, amount: '520000000000.00' },
              { source: 'FACTORY_DIVIDENDS', sourceId: 2, amount: '152410000000.00' },
            ]}
            totalReceived="1500000000000.00"
          />

          {/* Transaction History */}
          <TransactionHistory />
        </div>

        {/* Third Row - Investments */}
        <InvestmentsList 
          investments={[
            {
              id: 1,
              name: 'Trans-Siberian Railway Modernization',
              description: 'Infrastructure upgrade for high-speed rail network',
              amount: '50000000000.00',
              beneficiary: '0x1234567890123456789012345678901234567890',
              timestamp: Date.now() - 7776000000, // 90 days ago
              active: true,
              approvalHash: '0xabcd1234...',
            },
            {
              id: 2,
              name: 'Renewable Energy Grid Expansion',
              description: 'Solar and wind farm development across regions',
              amount: '75000000000.00',
              beneficiary: '0x0987654321098765432109876543210987654321',
              timestamp: Date.now() - 15552000000, // 180 days ago
              active: true,
              approvalHash: '0xefgh5678...',
            },
          ]}
        />

        {/* Information Panel */}
        <div className="rounded-2xl bg-slate-900/50 backdrop-blur border border-slate-700/50 p-6">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">
            Dashboard Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-400">
            <div className="space-y-2">
              <h3 className="text-emerald-400 font-semibold">Privacy First</h3>
              <p>
                Your wallet balance is hidden by default. Tap to reveal when needed. Optional auto-hide keeps your finances private.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-blue-400 font-semibold">Full Transparency</h3>
              <p>
                Sovereign Fund balance is public for all citizens. Track income sources, investments, and annual reports in real-time.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-purple-400 font-semibold">Real-time Updates</h3>
              <p>
                All data refreshes automatically. Wallet updates every 10s, fund data every 30s. No manual refresh needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
