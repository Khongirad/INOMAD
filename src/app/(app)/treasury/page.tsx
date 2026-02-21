'use client';

import * as React from 'react';
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  Banknote,
  Scale,
  Building2,
  Wallet,
  History,
  Settings,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  LogOut,
  Flame,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCentralBank } from '@/lib/hooks/use-central-bank';
import { cn } from '@/lib/utils';

export default function TreasuryPage() {
  const {
    publicStats,
    supply,
    dailyEmission,
    emissionHistory,
    licensedBanks,
    corrAccounts,
    policy,
    loading,
    error,
    hasTicket,
    role,
    isGovernor,
    authenticate,
    disconnect,
    emit,
    burn,
    issueLicense,
    revokeLicense,
    updatePolicy,
    refresh,
    refreshPublicStats,
  } = useCentralBank();

  const [pin, setPin] = React.useState('');
  const [authLoading, setAuthLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Emission form state
  const [emissionOpen, setEmissionOpen] = React.useState(false);
  const [emissionType, setEmissionType] = React.useState<'mint' | 'burn'>('mint');
  const [emissionAccountId, setEmissionAccountId] = React.useState('');
  const [emissionAmount, setEmissionAmount] = React.useState('');
  const [emissionReason, setEmissionReason] = React.useState('');
  const [emissionMemo, setEmissionMemo] = React.useState('');
  const [emissionLoading, setEmissionLoading] = React.useState(false);

  // License form state
  const [licenseOpen, setLicenseOpen] = React.useState(false);
  const [licenseBankAddress, setLicenseBankAddress] = React.useState('');
  const [licenseBankCode, setLicenseBankCode] = React.useState('');
  const [licenseBankName, setLicenseBankName] = React.useState('');
  const [licenseLoading, setLicenseLoading] = React.useState(false);

  // Policy form state
  const [policyOpen, setPolicyOpen] = React.useState(false);
  const [policyRate, setPolicyRate] = React.useState('');
  const [policyReserve, setPolicyReserve] = React.useState('');
  const [policyLimit, setPolicyLimit] = React.useState('');
  const [policyReason, setPolicyReason] = React.useState('');
  const [policyLoading, setPolicyLoading] = React.useState(false);

  const handleAuth = async () => {
    if (!pin) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      await authenticate(pin);
      setPin('');
    } catch (e: any) {
      setAuthError(e.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmission = async () => {
    if (!emissionAccountId || !emissionAmount || !emissionReason) return;
    setEmissionLoading(true);
    try {
      if (emissionType === 'mint') {
        await emit(emissionAccountId, Number(emissionAmount), emissionReason, emissionMemo || undefined);
      } else {
        await burn(emissionAccountId, Number(emissionAmount), emissionReason);
      }
      setEmissionOpen(false);
      setEmissionAccountId('');
      setEmissionAmount('');
      setEmissionReason('');
      setEmissionMemo('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setEmissionLoading(false);
    }
  };

  const handleIssueLicense = async () => {
    if (!licenseBankAddress || !licenseBankCode || !licenseBankName) return;
    setLicenseLoading(true);
    try {
      await issueLicense(licenseBankAddress, licenseBankCode, licenseBankName);
      setLicenseOpen(false);
      setLicenseBankAddress('');
      setLicenseBankCode('');
      setLicenseBankName('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLicenseLoading(false);
    }
  };

  const handleUpdatePolicy = async () => {
    if (!policyReason) return;
    const changes: { officialRate?: number; reserveRequirement?: number; dailyEmissionLimit?: number } = {};
    if (policyRate) changes.officialRate = Number(policyRate);
    if (policyReserve) changes.reserveRequirement = Number(policyReserve);
    if (policyLimit) changes.dailyEmissionLimit = Number(policyLimit);
    if (Object.keys(changes).length === 0) return;

    setPolicyLoading(true);
    try {
      await updatePolicy(changes, policyReason);
      setPolicyOpen(false);
      setPolicyRate('');
      setPolicyReserve('');
      setPolicyLimit('');
      setPolicyReason('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleRevokeLicense = async (licenseId: string, bankName: string) => {
    const reason = prompt(`Enter reason for revoking ${bankName}'s license:`);
    if (!reason) return;
    try {
      await revokeLicense(licenseId, reason);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Central Bank of Siberia
          </h2>
          <p className="text-zinc-400">
            Fourth Branch of Power — Monetary Authority
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => { refreshPublicStats(); if (hasTicket) refresh(); }}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          {hasTicket && (
            <Button variant="secondary" size="sm" onClick={disconnect}>
              <LogOut className="mr-2 h-4 w-4" /> Disconnect
            </Button>
          )}
        </div>
      </div>

      {/* Public Stats Banner (always visible) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-gold-border/30 bg-gradient-to-br from-zinc-900/80 to-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-surface/20">
                <Banknote className="h-5 w-5 text-gold-primary" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Circulating Supply</div>
                <div className="text-lg font-mono font-bold text-white">
                  {publicStats ? Number(publicStats.totalSupply).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                  <span className="text-gold-primary text-sm ml-1">ALT</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Total Minted</div>
                <div className="text-lg font-mono font-bold text-emerald-500">
                  {publicStats ? Number(publicStats.totalMinted).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                <Flame className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Total Burned</div>
                <div className="text-lg font-mono font-bold text-red-500">
                  {publicStats ? Number(publicStats.totalBurned).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                <Building2 className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Licensed Banks</div>
                <div className="text-lg font-mono font-bold text-white">
                  {publicStats?.licensedBanksCount ?? '—'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Official Rate Banner */}
      <Card className="border-gold-border/20 bg-gradient-to-r from-zinc-900/60 to-zinc-900/40">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Scale className="h-6 w-6 text-gold-primary" />
            <div>
              <div className="text-sm text-zinc-400">Official Exchange Rate</div>
              <div className="text-xl font-mono font-bold text-white">
                1 ALT = {publicStats ? Number(publicStats.officialRate).toFixed(4) : '1.0000'} USD
              </div>
            </div>
          </div>
          {publicStats?.lastEmissionDate && (
            <div className="text-right text-xs text-zinc-500">
              Last emission: {new Date(publicStats.lastEmissionDate).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auth Gate */}
      {!hasTicket ? (
        <Card className="border-white/10 bg-zinc-900/50">
          <CardContent className="p-8 text-center">
            <Landmark className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Governor Access</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Enter your wallet PIN to access the Central Bank dashboard.
              <br />
              Only authorized officers (Governor, Board Members) can sign in.
            </p>
            <div className="flex gap-2 max-w-xs mx-auto">
              <Input
                type="password"
                placeholder="Wallet PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              />
              <Button onClick={handleAuth} disabled={authLoading || !pin}>
                {authLoading ? '...' : 'Sign In'}
              </Button>
            </div>
            {authError && (
              <p className="text-red-400 text-xs mt-2">{authError}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Role Badge */}
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full",
              isGovernor ? "bg-gold-surface/20 text-gold-primary" : "bg-zinc-800 text-zinc-400"
            )}>
              {role}
            </span>
            {error && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {error}
              </span>
            )}
          </div>

          {/* Main Dashboard */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-zinc-900/50 border border-white/5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="emission">Emission</TabsTrigger>
              <TabsTrigger value="licensing">Licensing</TabsTrigger>
              <TabsTrigger value="policy">Policy</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Supply Stats */}
                <Card className="border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-zinc-400 uppercase flex items-center gap-2">
                      <Wallet className="h-4 w-4" /> Supply Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Minted</span>
                      <span className="font-mono text-emerald-500">
                        +{supply ? Number(supply.minted).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Burned</span>
                      <span className="font-mono text-red-500">
                        -{supply ? Number(supply.burned).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                      </span>
                    </div>
                    <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                      <span className="text-white font-medium">Circulating</span>
                      <span className="font-mono text-gold-primary font-bold">
                        {supply ? Number(supply.circulating).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Emission */}
                <Card className="border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-zinc-400 uppercase flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Daily Emission
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Used Today</span>
                      <span className="font-mono text-white">
                        {dailyEmission ? Number(dailyEmission.used).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Daily Limit</span>
                      <span className="font-mono text-zinc-500">
                        {dailyEmission ? Number(dailyEmission.limit).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                        style={{
                          width: dailyEmission
                            ? `${Math.min(100, (Number(dailyEmission.used) / Number(dailyEmission.limit)) * 100)}%`
                            : '0%',
                        }}
                      />
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      {dailyEmission ? Number(dailyEmission.remaining).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'} remaining
                    </div>
                  </CardContent>
                </Card>

                {/* Monetary Policy */}
                <Card className="border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-zinc-400 uppercase flex items-center gap-2">
                      <Settings className="h-4 w-4" /> Monetary Policy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Official Rate</span>
                      <span className="font-mono text-white">
                        {policy ? `${Number(policy.officialRate).toFixed(4)}%` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Reserve Req.</span>
                      <span className="font-mono text-white">
                        {policy ? `${(Number(policy.reserveRequirement) * 100).toFixed(2)}%` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Emission Limit</span>
                      <span className="font-mono text-white">
                        {policy ? Number(policy.dailyEmissionLimit).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
                      </span>
                    </div>
                    {isGovernor && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          if (policy) {
                            setPolicyRate(policy.officialRate);
                            setPolicyReserve(policy.reserveRequirement);
                            setPolicyLimit(policy.dailyEmissionLimit);
                          }
                          setPolicyOpen(true);
                        }}
                      >
                        <Settings className="mr-2 h-3 w-3" /> Update Policy
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Correspondent Accounts */}
              <Card className="border-white/5">
                <CardHeader>
                  <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                    <Building2 className="h-5 w-5" /> Correspondent Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {corrAccounts.length === 0 ? (
                    <div className="text-center text-zinc-500 py-8">
                      No correspondent accounts yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {corrAccounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-white/5"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                              <Building2 className="h-5 w-5 text-zinc-400" />
                            </div>
                            <div>
                              <div className="font-medium text-zinc-200">{acc.bankName}</div>
                              <div className="text-xs text-zinc-500 font-mono">{acc.accountRef}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-gold-primary">
                              {Number(acc.balance).toLocaleString('en-US', { maximumFractionDigits: 2 })} ALT
                            </div>
                            <div className={cn(
                              "text-xs uppercase",
                              acc.bankStatus === 'ACTIVE' ? 'text-emerald-500' : 'text-red-500'
                            )}>
                              {acc.bankStatus}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Emission Tab */}
            <TabsContent value="emission" className="space-y-6">
              {isGovernor && (
                <div className="flex gap-2">
                  <Button onClick={() => { setEmissionType('mint'); setEmissionOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Mint ALTAN
                  </Button>
                  <Button variant="secondary" onClick={() => { setEmissionType('burn'); setEmissionOpen(true); }}>
                    <Flame className="mr-2 h-4 w-4" /> Burn ALTAN
                  </Button>
                </div>
              )}

              <Card className="border-white/5">
                <CardHeader>
                  <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                    <History className="h-5 w-5" /> Emission History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {emissionHistory.length === 0 ? (
                    <div className="text-center text-zinc-500 py-8">
                      No emission records yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {emissionHistory.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/40 border border-white/5"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-full",
                              record.type === 'MINT' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                            )}>
                              {record.type === 'MINT' ? (
                                <TrendingUp className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <Flame className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-zinc-200">
                                {record.type === 'MINT' ? 'Minted to' : 'Burned from'} {record.bankName || 'Unknown'}
                              </div>
                              <div className="text-xs text-zinc-500">{record.reason}</div>
                              <div className="text-xs text-zinc-600">
                                {new Date(record.createdAt).toLocaleString()} · by {record.authorizedBy || 'System'}
                              </div>
                            </div>
                          </div>
                          <div className={cn(
                            "font-mono font-bold text-lg",
                            record.type === 'MINT' ? 'text-emerald-500' : 'text-red-500'
                          )}>
                            {record.type === 'MINT' ? '+' : '-'}
                            {Number(record.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Licensing Tab */}
            <TabsContent value="licensing" className="space-y-6">
              {isGovernor && (
                <Button onClick={() => setLicenseOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Issue New License
                </Button>
              )}

              <Card className="border-white/5">
                <CardHeader>
                  <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                    <Building2 className="h-5 w-5" /> Licensed Banks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {licensedBanks.length === 0 ? (
                    <div className="text-center text-zinc-500 py-8">
                      No licensed banks yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {licensedBanks.map((bank) => (
                        <div
                          key={bank.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-white/5"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-full",
                              bank.status === 'ACTIVE' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                            )}>
                              {bank.status === 'ACTIVE' ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-zinc-200">{bank.bankName}</div>
                              <div className="text-xs text-zinc-500">
                                Code: {bank.bankCode} · Issued: {new Date(bank.issuedAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-zinc-600 font-mono truncate max-w-[200px]">
                                {bank.bankAddress}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <div className={cn(
                                "text-xs font-bold uppercase px-2 py-1 rounded",
                                bank.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' :
                                bank.status === 'SUSPENDED' ? 'bg-amber-500/10 text-amber-500' :
                                'bg-red-500/10 text-red-500'
                              )}>
                                {bank.status}
                              </div>
                              {bank.corrAccount && (
                                <div className="text-xs text-zinc-500 mt-1 font-mono">
                                  Balance: {Number(bank.corrAccount.balance).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                </div>
                              )}
                            </div>
                            {isGovernor && bank.status === 'ACTIVE' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-400"
                                onClick={() => handleRevokeLicense(bank.id, bank.bankName)}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Policy Tab */}
            <TabsContent value="policy" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-gold-border/20 bg-gradient-to-br from-zinc-900/80 to-black">
                  <CardContent className="p-6 text-center">
                    <div className="text-sm text-zinc-500 uppercase mb-2">Official Rate</div>
                    <div className="text-3xl font-mono font-bold text-gold-primary">
                      {policy ? `${Number(policy.officialRate).toFixed(4)}%` : '—'}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/5">
                  <CardContent className="p-6 text-center">
                    <div className="text-sm text-zinc-500 uppercase mb-2">Reserve Requirement</div>
                    <div className="text-3xl font-mono font-bold text-white">
                      {policy ? `${(Number(policy.reserveRequirement) * 100).toFixed(2)}%` : '—'}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/5">
                  <CardContent className="p-6 text-center">
                    <div className="text-sm text-zinc-500 uppercase mb-2">Daily Emission Limit</div>
                    <div className="text-3xl font-mono font-bold text-white">
                      {policy ? Number(policy.dailyEmissionLimit).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {isGovernor && (
                <Button onClick={() => {
                  if (policy) {
                    setPolicyRate(policy.officialRate);
                    setPolicyReserve(policy.reserveRequirement);
                    setPolicyLimit(policy.dailyEmissionLimit);
                  }
                  setPolicyOpen(true);
                }}>
                  <Settings className="mr-2 h-4 w-4" /> Update Monetary Policy
                </Button>
              )}

              <Card className="border-white/5">
                <CardHeader>
                  <CardTitle className="text-base text-zinc-200">Policy Effective Since</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-zinc-400">
                    {policy?.effectiveFrom ? new Date(policy.effectiveFrom).toLocaleString() : 'N/A'}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Emission Sheet */}
      <Sheet open={emissionOpen} onOpenChange={setEmissionOpen} title={emissionType === 'mint' ? 'Mint ALTAN' : 'Burn ALTAN'}>
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label>Correspondent Account</Label>
            <Select value={emissionAccountId} onValueChange={setEmissionAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {corrAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.bankName} ({acc.bankCode}) — {Number(acc.balance).toLocaleString('en-US', { maximumFractionDigits: 2 })} ALT
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={emissionAmount}
              onChange={(e) => setEmissionAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Input
              placeholder="e.g., Initial liquidity provision"
              value={emissionReason}
              onChange={(e) => setEmissionReason(e.target.value)}
            />
          </div>

          {emissionType === 'mint' && (
            <div className="space-y-2">
              <Label>Memo (optional)</Label>
              <Textarea
                placeholder="Additional notes..."
                value={emissionMemo}
                onChange={(e) => setEmissionMemo(e.target.value)}
              />
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleEmission}
            disabled={emissionLoading || !emissionAccountId || !emissionAmount || !emissionReason}
          >
            {emissionLoading ? 'Processing...' : emissionType === 'mint' ? 'Mint ALTAN' : 'Burn ALTAN'}
          </Button>
        </div>
      </Sheet>

      {/* License Sheet */}
      <Sheet open={licenseOpen} onOpenChange={setLicenseOpen} title="Issue Bank License">
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label>Bank Wallet Address</Label>
            <Input
              placeholder="0x..."
              value={licenseBankAddress}
              onChange={(e) => setLicenseBankAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Bank Code</Label>
            <Input
              placeholder="e.g., SIB001"
              value={licenseBankCode}
              onChange={(e) => setLicenseBankCode(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input
              placeholder="e.g., Bank of Siberia"
              value={licenseBankName}
              onChange={(e) => setLicenseBankName(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleIssueLicense}
            disabled={licenseLoading || !licenseBankAddress || !licenseBankCode || !licenseBankName}
          >
            {licenseLoading ? 'Processing...' : 'Issue License'}
          </Button>
        </div>
      </Sheet>

      {/* Policy Sheet */}
      <Sheet open={policyOpen} onOpenChange={setPolicyOpen} title="Update Monetary Policy">
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label>Official Rate (%)</Label>
            <Input
              type="number"
              step="0.0001"
              placeholder="e.g., 0.0500"
              value={policyRate}
              onChange={(e) => setPolicyRate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Reserve Requirement (decimal)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="e.g., 0.10 for 10%"
              value={policyReserve}
              onChange={(e) => setPolicyReserve(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Daily Emission Limit</Label>
            <Input
              type="number"
              placeholder="e.g., 10000000"
              value={policyLimit}
              onChange={(e) => setPolicyLimit(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Reason for Change *</Label>
            <Textarea
              placeholder="Explain the policy change..."
              value={policyReason}
              onChange={(e) => setPolicyReason(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleUpdatePolicy}
            disabled={policyLoading || !policyReason}
          >
            {policyLoading ? 'Processing...' : 'Update Policy'}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
