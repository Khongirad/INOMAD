'use client';

import * as React from 'react';
import {
  Users, Shield, Landmark, ScrollText, ThumbsUp, ThumbsDown,
  Crown, MapPin, Clock, CheckCircle2, XCircle, ArrowRight,
  Flag, RefreshCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  getPendingAdmissions,
  voteOnAdmission,
  checkLegislativeEligibility,
  checkGovernmentEligibility,
  getExclusiveRightHistory,
} from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/use-auth';

// ─── Types ───

interface Admission {
  id: string;
  applicantId: string;
  applicant?: { username: string; id: string };
  status: string;
  votesFor: number;
  votesAgainst: number;
  votesRequired: number;
  createdAt: string;
}

interface RightTransfer {
  id: string;
  type: string;
  fromUserId?: string;
  toUserId?: string;
  fromUser?: { username: string };
  toUser?: { username: string };
  createdAt: string;
}

// ─── Component ───

export default function CitizenshipPage() {
  const { user } = useAuth();
  const [admissions, setAdmissions] = React.useState<Admission[]>([]);
  const [rightHistory, setRightHistory] = React.useState<RightTransfer[]>([]);
  const [legislativeEligible, setLegislativeEligible] = React.useState<boolean | null>(null);
  const [governmentEligible, setGovernmentEligible] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const [admData, legCheck, govCheck, history] = await Promise.all([
        getPendingAdmissions().catch(() => []),
        checkLegislativeEligibility(user.userId).catch(() => ({ eligible: false })),
        checkGovernmentEligibility(user.userId).catch(() => ({ eligible: false })),
        getExclusiveRightHistory(user.userId).catch(() => []),
      ]);
      setAdmissions(admData);
      setLegislativeEligible(legCheck.eligible);
      setGovernmentEligible(govCheck.eligible);
      setRightHistory(history);
    } catch (err: any) {
      toast.error(err.message || 'Error загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVote = async (admissionId: string, vote: 'FOR' | 'AGAINST') => {
    if (!user?.userId) return;
    try {
      await voteOnAdmission(admissionId, { voterId: user.userId, vote });
      toast.success(vote === 'FOR' ? 'Vote «за» принят' : 'Vote «против» принят');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error votesания');
    }
  };

  const citizenType = (user as any)?.citizenType || 'RESIDENT';
  const hasExclusiveRight = (user as any)?.hasExclusiveLandRight || false;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INDIGENOUS': return 'Indigenous (Indigenous)';
      case 'CITIZEN': return 'Citizen (Citizen)';
      default: return 'Житель (Resident)';
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'INDIGENOUS': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'CITIZEN': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const getTransferLabel = (type: string) => {
    switch (type) {
      case 'INITIAL_GRANT': return 'Issuance';
      case 'INHERITANCE': return 'Наследование';
      case 'REVERTED_TO_FUND': return 'Return to fund';
      default: return type;
    }
  };

  const getTransferStyle = (type: string) => {
    switch (type) {
      case 'INITIAL_GRANT': return 'text-blue-400 bg-blue-500/10';
      case 'INHERITANCE': return 'text-emerald-400 bg-emerald-500/10';
      default: return 'text-amber-400 bg-amber-500/10';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Flag className="text-amber-500 w-8 h-8" />
            Citizenship
          </h2>
          <p className="text-zinc-400 mt-1">
            Governance citizensским статусом, земельным rightм и admissionом citizens
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => fetchData()}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Citizen Type */}
        <Card className="border-gold-border/30 bg-gradient-to-br from-zinc-900/80 to-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-surface/20">
                {citizenType === 'INDIGENOUS' ? (
                  <Crown className="h-5 w-5 text-gold-primary" />
                ) : (
                  <Users className="h-5 w-5 text-gold-primary" />
                )}
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Status</div>
                <div className={cn(
                  "text-sm font-bold uppercase px-2 py-0.5 rounded border mt-0.5 inline-block",
                  getTypeStyle(citizenType)
                )}>
                  {getTypeLabel(citizenType)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exclusive Land Right */}
        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                hasExclusiveRight ? "bg-emerald-500/10" : "bg-zinc-500/10"
              )}>
                <MapPin className={cn("h-5 w-5", hasExclusiveRight ? "text-emerald-500" : "text-zinc-500")} />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Land Rights</div>
                <div className="flex items-center gap-1 mt-0.5">
                  {hasExclusiveRight ? (
                    <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-emerald-500 font-bold text-sm">Yes</span></>
                  ) : (
                    <><XCircle className="h-4 w-4 text-zinc-500" /><span className="text-zinc-500 font-bold text-sm">Нет</span></>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legislative Eligibility */}
        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                legislativeEligible ? "bg-emerald-500/10" : "bg-zinc-500/10"
              )}>
                <Landmark className={cn("h-5 w-5", legislativeEligible ? "text-emerald-500" : "text-zinc-500")} />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Khural</div>
                <div className="flex items-center gap-1 mt-0.5">
                  {legislativeEligible ? (
                    <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-emerald-500 font-bold text-sm">Admitted</span></>
                  ) : (
                    <><XCircle className="h-4 w-4 text-zinc-500" /><span className="text-zinc-500 font-bold text-sm">Нет</span></>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Government Eligibility */}
        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                governmentEligible ? "bg-emerald-500/10" : "bg-zinc-500/10"
              )}>
                <Shield className={cn("h-5 w-5", governmentEligible ? "text-emerald-500" : "text-zinc-500")} />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Исп. / Court.</div>
                <div className="flex items-center gap-1 mt-0.5">
                  {governmentEligible ? (
                    <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-emerald-500 font-bold text-sm">Admitted</span></>
                  ) : (
                    <><XCircle className="h-4 w-4 text-zinc-500" /><span className="text-zinc-500 font-bold text-sm">Нет</span></>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="admissions" className="space-y-6">
        <TabsList className="bg-zinc-900/50 border border-white/5">
          <TabsTrigger value="admissions">
            Admission citizens ({admissions.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History права ({rightHistory.length})
          </TabsTrigger>
        </TabsList>

        {/* Admissions Tab */}
        <TabsContent value="admissions" className="space-y-4">
          {citizenType !== 'INDIGENOUS' && (
            <Card className="border-amber-500/20 bg-amber-950/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 flex-shrink-0">
                    <Crown className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-200 mb-1">Only for коренных</h4>
                    <p className="text-sm text-amber-100/70">
                      Voting за приём новых citizens accessно only коренным (INDIGENOUS).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="text-center text-zinc-500 py-12 animate-pulse">Загрузка заявок...</div>
          ) : admissions.length === 0 ? (
            <Card className="border-white/5 bg-zinc-900/30">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-1">No заявок</h3>
                <p className="text-zinc-400 text-sm">Ожидающих заявок на citizenship нет</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {admissions.map((admission) => (
                <Card key={admission.id} className="border-white/5 bg-zinc-900/50 hover:border-amber-500/20 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                          <Users className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {admission.applicant?.username || admission.applicantId.slice(0, 12) + '...'}
                          </div>
                          <div className="text-xs text-zinc-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(admission.createdAt).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-emerald-500/10 text-emerald-500">
                          За: {admission.votesFor}
                        </span>
                        <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-red-500/10 text-red-500">
                          Against: {admission.votesAgainst}
                        </span>
                        <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-zinc-500/10 text-zinc-400">
                          Нужно: {admission.votesRequired}
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
                        style={{
                          width: admission.votesRequired > 0
                            ? `${Math.min(100, (admission.votesFor / admission.votesRequired) * 100)}%`
                            : '0%',
                        }}
                      />
                    </div>

                    {/* Vote buttons (INDIGENOUS only) */}
                    {citizenType === 'INDIGENOUS' && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleVote(admission.id, 'FOR')}
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" /> За
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleVote(admission.id, 'AGAINST')}
                        >
                          <ThumbsDown className="mr-2 h-4 w-4" /> Against
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Right History Tab */}
        <TabsContent value="history" className="space-y-4">
          {rightHistory.length === 0 ? (
            <Card className="border-white/5 bg-zinc-900/30">
              <CardContent className="p-8 text-center">
                <ScrollText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-1">No записей</h3>
                <p className="text-zinc-400 text-sm">History передачи земельного права пуста</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-white/5 bg-zinc-900/30">
              <CardHeader>
                <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                  <ScrollText className="h-5 w-5" /> Right Transfer Log
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rightHistory.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-gold-primary/20 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "text-xs font-bold uppercase px-2 py-1 rounded",
                        getTransferStyle(transfer.type)
                      )}>
                        {getTransferLabel(transfer.type)}
                      </span>
                      <div className="text-sm text-zinc-300">
                        {transfer.fromUser?.username || '—'}
                        <ArrowRight className="inline h-4 w-4 mx-2 text-zinc-600" />
                        {transfer.toUser?.username || 'Landый fund'}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(transfer.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Info Banner */}
      <Card className="border-gold-border/20 bg-gold-surface/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-surface/20 flex-shrink-0">
              <Flag className="h-4 w-4 text-gold-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-gold-primary mb-1">Принципы citizensства</h4>
              <p className="text-sm text-zinc-300">
                Indigenous people — source власти на своей земле. Claimлючительное земельное right
                передаётся по male линии. Khural формируется из держателей земельного права.
                Приём новых citizens осуществляется votingм коренных.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
