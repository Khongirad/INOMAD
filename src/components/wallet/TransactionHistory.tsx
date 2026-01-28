/**
 * TransactionHistory - Recent wallet transactions
 * Shows recent ALTAN transactions with details
 */

'use client';

import { ArrowUpRight, ArrowDownLeft, CheckCircle, Clock, ExternalLink } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'receive' | 'send';
  amount: string;
  from?: string;
  to?: string;
  reason: string;
  timestamp: number;
  status: 'confirmed' | 'pending';
  txHash?: string;
}

interface TransactionHistoryProps {
  transactions?: Transaction[];
}

// Mock data for demo
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'receive',
    amount: '17241.00',
    from: 'Distribution Pool',
    reason: 'Initial citizen distribution',
    timestamp: Date.now() - 86400000, // 1 day ago
    status: 'confirmed',
    txHash: '0x1234...5678',
  },
  {
    id: '2',
    type: 'send',
    amount: '500.00',
    to: '@user123',
    reason: 'Payment for services',
    timestamp: Date.now() - 172800000, // 2 days ago
    status: 'confirmed',
    txHash: '0xabcd...efgh',
  },
  {
    id: '3',
    type: 'receive',
    amount: '250.00',
    from: '@merchant456',
    reason: 'Refund',
    timestamp: Date.now() - 259200000, // 3 days ago
    status: 'confirmed',
    txHash: '0x9876...5432',
  },
];

export function TransactionHistory({ transactions = MOCK_TRANSACTIONS }: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/50 backdrop-blur border border-slate-700/50 p-8">
        <div className="text-center space-y-2">
          <p className="text-slate-400">No transactions yet</p>
          <p className="text-xs text-slate-500">
            Your transaction history will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-200">
              Recent Transactions
            </h3>
            <p className="text-xs text-slate-400">
              Latest wallet activity
            </p>
          </div>
          <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            View All
          </button>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {transactions.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isReceive = transaction.type === 'receive';
  const isPending = transaction.status === 'pending';

  return (
    <div className="group relative rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 p-2 rounded-full ${
          isReceive 
            ? 'bg-emerald-500/10 border border-emerald-500/30' 
            : 'bg-blue-500/10 border border-blue-500/30'
        }`}>
          {isReceive ? (
            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
          ) : (
            <ArrowUpRight className="w-5 h-5 text-blue-400" />
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Reason */}
          <p className="text-sm font-medium text-slate-200 truncate">
            {transaction.reason}
          </p>
          
          {/* From/To */}
          <p className="text-xs text-slate-400">
            {isReceive ? 'From' : 'To'}: {' '}
            <span className="text-slate-300">
              {isReceive ? transaction.from : transaction.to}
            </span>
          </p>
          
          {/* Timestamp */}
          <p className="text-xs text-slate-500">
            {formatTimestamp(transaction.timestamp)}
          </p>
        </div>

        {/* Amount & Status */}
        <div className="flex-shrink-0 text-right space-y-2">
          <p className={`text-lg font-semibold ${
            isReceive ? 'text-emerald-400' : 'text-blue-400'
          }`}>
            {isReceive ? '+' : '-'}{transaction.amount} ₳
          </p>
          
          {/* Status Badge */}
          {isPending ? (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
              <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="text-xs text-amber-400">Pending</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span className="text-xs text-emerald-400">Confirmed</span>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Hash Link */}
      {transaction.txHash && (
        <a
          href={`#tx-${transaction.txHash}`}
          className="mt-3 flex items-center gap-2 text-xs text-slate-500 hover:text-blue-400 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Tx: {transaction.txHash}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
