'use client';

import * as React from 'react';
import {
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Send,
  Plus,
  RefreshCcw,
  Shield,
  PenLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getOrgBankAccounts,
  getAccountTransactions,
  getPendingTransactions,
  getDailyReports,
  initiateTransaction,
  signTransaction,
  bankApproveTransaction,
  cancelTransaction,
} from '@/lib/api';
import type {
  OrgBankAccount,
  OrgBankTransaction,
  BankDailyReport,
  OrgBankTxType,
  OrgBankTxStatus,
} from '@/lib/api';

export default function OrgBankingPage() {
  // State
  const [orgId, setOrgId] = React.useState('');
  const [accounts, setAccounts] = React.useState<OrgBankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = React.useState<OrgBankAccount | null>(null);
  const [transactions, setTransactions] = React.useState<OrgBankTransaction[]>([]);
  const [pendingTxs, setPendingTxs] = React.useState<OrgBankTransaction[]>([]);
  const [reports, setReports] = React.useState<BankDailyReport[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // New transaction form
  const [txOpen, setTxOpen] = React.useState(false);
  const [txType, setTxType] = React.useState<OrgBankTxType>('OUTGOING');
  const [txAmount, setTxAmount] = React.useState('');
  const [txDesc, setTxDesc] = React.useState('');
  const [txRecipient, setTxRecipient] = React.useState('');
  const [txLoading, setTxLoading] = React.useState(false);

  const fetchAccounts = React.useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getOrgBankAccounts(orgId);
      setAccounts(data);
      if (data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts');
      toast.error(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [orgId, selectedAccount]);

  const fetchTransactions = React.useCallback(async () => {
    if (!selectedAccount) return;
    try {
      const [txData, pendingData, reportData] = await Promise.all([
        getAccountTransactions(selectedAccount.id),
        getPendingTransactions(orgId),
        getDailyReports(selectedAccount.id),
      ]);
      setTransactions(txData);
      setPendingTxs(pendingData);
      setReports(reportData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load transactions');
    }
  }, [selectedAccount, orgId]);

  React.useEffect(() => {
    if (orgId) fetchAccounts();
  }, [orgId, fetchAccounts]);

  React.useEffect(() => {
    if (selectedAccount) fetchTransactions();
  }, [selectedAccount, fetchTransactions]);

  const handleInitiate = async () => {
    if (!selectedAccount || !txAmount || !txDesc) return;
    setTxLoading(true);
    try {
      await initiateTransaction({
        accountId: selectedAccount.id,
        type: txType,
        amount: Number(txAmount),
        description: txDesc,
        recipientAccount: txRecipient || undefined,
      });
      toast.success('Transaction initiated');
      setTxOpen(false);
      setTxAmount('');
      setTxDesc('');
      setTxRecipient('');
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setTxLoading(false);
    }
  };

  const handleSign = async (txId: string) => {
    try {
      await signTransaction(txId);
      toast.success('Signature added');
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBankApprove = async (txId: string, approved: boolean) => {
    const note = approved ? undefined : prompt('Rejection Reason:') || undefined;
    try {
      await bankApproveTransaction(txId, { approved, note });
      toast.success(approved ? 'Approved by bank' : 'Rejected');
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCancel = async (txId: string) => {
    try {
      await cancelTransaction(txId);
      toast.success('Transaction cancelled');
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getStatusBadge = (status: OrgBankTxStatus) => {
    const map: Record<OrgBankTxStatus, { color: string; label: string }> = {
      PENDING: { color: 'bg-amber-500/10 text-amber-500', label: 'Pending' },
      CLIENT_APPROVED: { color: 'bg-blue-500/10 text-blue-500', label: 'Client approved' },
      BANK_APPROVED: { color: 'bg-indigo-500/10 text-indigo-500', label: 'Bank approved' },
      COMPLETED: { color: 'bg-emerald-500/10 text-emerald-500', label: 'Completed' },
      REJECTED: { color: 'bg-red-500/10 text-red-500', label: 'Rejected' },
      CANCELLED: { color: 'bg-zinc-500/10 text-zinc-500', label: 'Cancelled' },
    };
    const { color, label } = map[status] || map.PENDING;
    return <span className={cn('text-xs font-bold uppercase px-2 py-1 rounded', color)}>{label}</span>;
  };

  const getTxIcon = (type: OrgBankTxType) => {
    switch (type) {
      case 'OUTGOING': return <ArrowUpRight className="h-4 w-4 text-red-400" />;
      case 'INCOMING': return <ArrowDownLeft className="h-4 w-4 text-emerald-400" />;
      case 'INTERNAL': return <Building2 className="h-4 w-4 text-blue-400" />;
      case 'TAX_PAYMENT': return <FileText className="h-4 w-4 text-amber-400" />;
      default: return <Send className="h-4 w-4 text-zinc-400" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Organization banking operations
          </h2>
          <p className="text-zinc-400">
            Dual Authorization — client + bank officer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="ID organizations"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="max-w-[200px]"
          />
          <Button variant="secondary" size="sm" onClick={fetchAccounts} disabled={!orgId || loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {accounts.length === 0 && !loading ? (
        <Card className="border-white/10 bg-zinc-900/50">
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No accounts</h3>
            <p className="text-zinc-400 text-sm">
              Enter the Organization ID and click "Load" to view banking accounts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Account selector + stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {accounts.map((acc) => (
              <Card
                key={acc.id}
                className={cn(
                  'cursor-pointer transition-all border',
                  selectedAccount?.id === acc.id
                    ? 'border-gold-border/50 bg-gradient-to-br from-zinc-900/80 to-black'
                    : 'border-white/5 hover:border-white/20'
                )}
                onClick={() => setSelectedAccount(acc)}
              >
                <CardContent className="p-4">
                  <div className="text-xs text-zinc-500 uppercase mb-1">{acc.accountType}</div>
                  <div className="text-lg font-mono font-bold text-white">
                    {Number(acc.balance).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    <span className="text-gold-primary text-sm ml-1">{acc.currency}</span>
                  </div>
                  <div className="text-xs text-zinc-600 font-mono mt-1">{acc.accountNumber}</div>
                  <div className="flex items-center gap-1 mt-2">
                    <Shield className="h-3 w-3 text-zinc-500" />
                    <span className="text-xs text-zinc-500">
                      {acc.clientSignaturesRequired} signature · {acc.bankApprovalLevel}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedAccount && (
            <Tabs defaultValue="pending" className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList className="bg-zinc-900/50 border border-white/5">
                  <TabsTrigger value="pending">
                    Pending ({pendingTxs.length})
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    History
                  </TabsTrigger>
                  <TabsTrigger value="reports">
                    Reports ({reports.length})
                  </TabsTrigger>
                </TabsList>
                <Button size="sm" onClick={() => setTxOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New transaction
                </Button>
              </div>

              {/* Pending Transactions */}
              <TabsContent value="pending" className="space-y-4">
                {pendingTxs.length === 0 ? (
                  <Card className="border-white/5">
                    <CardContent className="p-8 text-center text-zinc-500">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                      No pending transactions
                    </CardContent>
                  </Card>
                ) : (
                  pendingTxs.map((tx) => (
                    <Card key={tx.id} className="border-white/5">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                              {getTxIcon(tx.type)}
                            </div>
                            <div>
                              <div className="font-medium text-zinc-200">{tx.description}</div>
                              <div className="text-xs text-zinc-500">
                                {new Date(tx.createdAt).toLocaleString('ru-RU')}
                                {tx.recipientAccount && ` → ${tx.recipientAccount}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={cn(
                                'font-mono font-bold',
                                tx.type === 'INCOMING' ? 'text-emerald-500' : 'text-red-400'
                              )}>
                                {tx.type === 'INCOMING' ? '+' : '-'}
                                {Number(tx.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              </div>
                              {getStatusBadge(tx.status)}
                            </div>
                            <div className="flex flex-col gap-1">
                              {tx.status === 'PENDING' && (
                                <>
                                  <Button size="sm" variant="secondary" onClick={() => handleSign(tx.id)}>
                                    <PenLine className="mr-1 h-3 w-3" /> Sign
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleCancel(tx.id)}>
                                    Cancel
                                  </Button>
                                </>
                              )}
                              {tx.status === 'CLIENT_APPROVED' && (
                                <div className="flex gap-1">
                                  <Button size="sm" onClick={() => handleBankApprove(tx.id, true)}>
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleBankApprove(tx.id, false)}>
                                    <XCircle className="mr-1 h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Signature progress */}
                        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                          <PenLine className="h-3 w-3" />
                          Signatures: {tx.clientSignatures?.length || 0} / {selectedAccount.clientSignaturesRequired}
                          {tx.bankApproved && <span className="text-emerald-500">· Bank ✓</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Transaction History */}
              <TabsContent value="history" className="space-y-3">
                {transactions.length === 0 ? (
                  <Card className="border-white/5">
                    <CardContent className="p-8 text-center text-zinc-500">
                      No transactions
                    </CardContent>
                  </Card>
                ) : (
                  transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/40 border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full',
                          tx.type === 'INCOMING' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                        )}>
                          {getTxIcon(tx.type)}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-200">{tx.description}</div>
                          <div className="text-xs text-zinc-500">
                            {new Date(tx.createdAt).toLocaleString('ru-RU')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          'font-mono font-bold',
                          tx.type === 'INCOMING' ? 'text-emerald-500' : 'text-red-400'
                        )}>
                          {tx.type === 'INCOMING' ? '+' : '-'}
                          {Number(tx.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </div>
                        {getStatusBadge(tx.status)}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Daily Reports */}
              <TabsContent value="reports" className="space-y-4">
                {reports.length === 0 ? (
                  <Card className="border-white/5">
                    <CardContent className="p-8 text-center text-zinc-500">
                      <FileText className="h-8 w-8 mx-auto mb-2" />
                      No daily reports
                    </CardContent>
                  </Card>
                ) : (
                  reports.map((report) => (
                    <Card key={report.id} className="border-white/5">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-zinc-400" />
                            <span className="font-medium text-zinc-200">
                              {new Date(report.reportDate).toLocaleDateString('en-US')}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-500">
                            {report.txCount} transactions · {report.pendingCount} pending
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <div className="text-xs text-zinc-500">Start bal.</div>
                            <div className="font-mono text-sm text-white">
                              {Number(report.openingBalance).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500">Income</div>
                            <div className="font-mono text-sm text-emerald-500">
                              +{Number(report.totalIncoming).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500">Expense</div>
                            <div className="font-mono text-sm text-red-400">
                              -{Number(report.totalOutgoing).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500">End bal.</div>
                            <div className="font-mono text-sm font-bold text-gold-primary">
                              {Number(report.closingBalance).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      {/* New Transaction Sheet */}
      <Sheet open={txOpen} onOpenChange={setTxOpen} title="New transaction">
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label>Type operations</Label>
            <Select value={txType} onValueChange={(v) => setTxType(v as OrgBankTxType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OUTGOING">Outgoing Payment</SelectItem>
                <SelectItem value="INCOMING">Incoming Payment</SelectItem>
                <SelectItem value="INTERNAL">Inner transfer</SelectItem>
                <SelectItem value="TAX_PAYMENT">Tax Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount (ALTAN)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Payment purpose..."
              value={txDesc}
              onChange={(e) => setTxDesc(e.target.value)}
            />
          </div>

          {txType === 'OUTGOING' && (
            <div className="space-y-2">
              <Label>Recipient Account</Label>
              <Input
                placeholder="Recipient account number"
                value={txRecipient}
                onChange={(e) => setTxRecipient(e.target.value)}
              />
            </div>
          )}

          <div className="p-3 rounded-lg bg-zinc-800/50 text-xs text-zinc-400">
            <Shield className="h-3 w-3 inline mr-1" />
            Required: {selectedAccount?.clientSignaturesRequired || 1} client signature(s)
            + bank approval ({selectedAccount?.bankApprovalLevel || 'MANAGER'})
          </div>

          <Button
            className="w-full"
            onClick={handleInitiate}
            disabled={txLoading || !txAmount || !txDesc}
          >
            {txLoading ? 'Submitting...' : 'Initiate transaction'}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
