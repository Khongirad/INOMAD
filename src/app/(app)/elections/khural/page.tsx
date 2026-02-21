'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Vote, Users, CheckCircle2, ShieldCheck, Clock,
  Crown, Hash, Loader2, Plus, Scale, AlertCircle,
  ChevronRight, FileText,
} from 'lucide-react';
import { api } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────────────────

type ElectionStatus = 'NOMINATION' | 'VOTING' | 'CERTIFIED' | 'CANCELLED';

interface KhuralElection {
  id: string;
  title: string;
  description?: string;
  electionType: string;
  status: ElectionStatus;
  nominationDeadline: string;
  votingStart: string;
  votingEnd: string;
  seatsCount: number;
  totalVotes: number;
  certifiedAt?: string;
  resultHash?: string;
  winnerId?: string;
  candidates: {
    id: string;
    candidateId: string;
    platform?: string;
    voteCount: number;
    candidate: { seatId: string; username?: string };
  }[];
  _count: { ballots: number };
}

interface CIK {
  id: string;
  type: 'PROVISIONAL' | 'PERMANENT';
  status: 'ACTIVE' | 'DISSOLVED';
  mandate?: string;
  members: {
    id: string;
    role: string;
    user: { seatId: string; username?: string; isVerified: boolean };
  }[];
}

// ── Status badge ──────────────────────────────────────────────────────────

const STATUS_META: Record<ElectionStatus, { label: string; color: string }> = {
  NOMINATION: { label: 'Регистрация кандидатов', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  VOTING:     { label: 'Голосование ✓', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  CERTIFIED:  { label: 'Результаты заверены', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  CANCELLED:  { label: 'Отменено', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
};

// ── Countdown ─────────────────────────────────────────────────────────────

function Countdown({ to }: { to: string }) {
  const diff = Math.max(0, new Date(to).getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return (
    <span className="tabular-nums font-mono text-xs text-amber-400">
      {days > 0 ? `${days}д ` : ''}{hours}ч {mins}м
    </span>
  );
}

// ── Election card ─────────────────────────────────────────────────────────

function ElectionCard({
  election,
  onVote,
  onRegister,
}: {
  election: KhuralElection;
  onVote: (electionId: string, candidateId: string) => void;
  onRegister: (electionId: string) => void;
}) {
  const statusMeta = STATUS_META[election.status];
  const now = new Date();
  const isVoting = election.status === 'VOTING';
  const isNomination = election.status === 'NOMINATION';

  return (
    <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusMeta.color}`}>
              {statusMeta.label}
            </span>
            <span className="text-xs text-slate-500">{election.electionType}</span>
            <span className="text-xs text-slate-500">• {election.seatsCount} мест(а)</span>
          </div>
          <h3 className="font-bold text-white text-base">{election.title}</h3>
          {election.description && (
            <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">{election.description}</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className={`p-2 rounded-xl border ${isNomination ? 'border-blue-500/30 bg-blue-500/5' : 'border-slate-700/30 bg-slate-800/20'}`}>
          <p className="text-slate-400 mb-0.5">📋 Выдвижение</p>
          <p className="text-white font-medium">{new Date(election.nominationDeadline).toLocaleDateString('ru-RU')}</p>
          {isNomination && <Countdown to={election.nominationDeadline} />}
        </div>
        <div className={`p-2 rounded-xl border ${isVoting ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700/30 bg-slate-800/20'}`}>
          <p className="text-slate-400 mb-0.5">🗳 Голосование</p>
          <p className="text-white font-medium">{new Date(election.votingStart).toLocaleDateString('ru-RU')}</p>
          {isVoting && <Countdown to={election.votingEnd} />}
        </div>
        <div className="p-2 rounded-xl border border-slate-700/30 bg-slate-800/20">
          <p className="text-slate-400 mb-0.5">⚡ Конец</p>
          <p className="text-white font-medium">{new Date(election.votingEnd).toLocaleDateString('ru-RU')}</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {election.candidates.length} кандидат(ов)</span>
        <span className="flex items-center gap-1"><Vote className="h-3.5 w-3.5" /> {election._count.ballots} голосов</span>
        {election.certifiedAt && (
          <span className="flex items-center gap-1 text-purple-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Заверено {new Date(election.certifiedAt).toLocaleDateString('ru-RU')}
          </span>
        )}
      </div>

      {/* Candidates list */}
      {election.candidates.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs text-slate-400 font-medium">Кандидаты:</p>
          {election.candidates.slice(0, 5).map((c, i) => (
            <div key={c.id} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${i === 0 && election.status === 'CERTIFIED' ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-slate-300'}`}>
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{c.candidate.username || c.candidate.seatId}</p>
                {c.platform && <p className="text-xs text-slate-400 line-clamp-1">{c.platform}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{c.voteCount}</p>
                {election._count.ballots > 0 && (
                  <p className="text-xs text-slate-500">
                    {Math.round((c.voteCount / election._count.ballots) * 100)}%
                  </p>
                )}
                {isVoting && (
                  <button
                    onClick={() => onVote(election.id, c.candidateId)}
                    className="mt-1 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-all"
                  >
                    Голосовать
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Result hash */}
      {election.resultHash && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20">
          <Hash className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-purple-400 font-medium">Хеш результата (Merkle)</p>
            <p className="text-[10px] font-mono text-slate-400 break-all">{election.resultHash}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      {isNomination && (
        <button
          onClick={() => onRegister(election.id)}
          className="mt-3 w-full py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 text-blue-400 text-sm font-semibold hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Выдвинуть свою кандидатуру
        </button>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function KhuralElectionsPage() {
  const [cik, setCik] = useState<CIK | null>(null);
  const [elections, setElections] = useState<KhuralElection[]>([]);
  const [loading, setLoading] = useState(true);

  // Register candidate form
  const [registerModal, setRegisterModal] = useState<{ electionId: string } | null>(null);
  const [platform, setPlatform] = useState('');
  const [registering, setRegistering] = useState(false);
  const [voting, setVoting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cikRes, electionsRes] = await Promise.all([
        api.get<CIK | null>('/cik').catch(() => null),
        api.get<KhuralElection[]>('/cik/elections').catch(() => []),
      ]);
      setCik(cikRes);
      setElections(Array.isArray(electionsRes) ? electionsRes : []);
    } catch {
      toast.error('Ошибка загрузки данных ЦИК');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleVote = async (electionId: string, candidateId: string) => {
    setVoting(true);
    try {
      const result = await api.post<{ merkleLeaf: string }>('/cik/vote', { electionId, candidateId });
      toast.success(`✅ Голос принят! Merkle-лист: ${result.merkleLeaf.slice(0, 16)}…`);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка голосования');
    } finally {
      setVoting(false);
    }
  };

  const handleRegister = async () => {
    if (!registerModal) return;
    setRegistering(true);
    try {
      await api.post('/cik/candidates', { electionId: registerModal.electionId, platform });
      toast.success('Кандидатура зарегистрирована');
      setRegisterModal(null);
      setPlatform('');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка регистрации');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="h-5 w-5 text-purple-400" />
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">ЦИК — Центральная Избирательная Комиссия</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Выборы в Хурал</h1>
          <p className="text-slate-400 text-sm mt-1">
            Криптографически заверенные результаты · Merkle-доказательства
          </p>
        </div>

        {/* CIK panel */}
        {cik && (
          <div className={`mb-6 p-4 rounded-2xl border ${
            cik.type === 'PROVISIONAL'
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-emerald-500/30 bg-emerald-500/5'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className={`h-5 w-5 ${cik.type === 'PROVISIONAL' ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span className={`text-sm font-semibold ${cik.type === 'PROVISIONAL' ? 'text-amber-300' : 'text-emerald-300'}`}>
                {cik.type === 'PROVISIONAL' ? '⚡ Временный ЦИК (назначен Создателем)' : '🏛️ Постоянный ЦИК (назначен Хуралом)'}
              </span>
            </div>
            {cik.mandate && <p className="text-xs text-slate-400 mb-3">{cik.mandate}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              {cik.members.map(m => (
                <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-700/40">
                  {m.role === 'CHAIR' && <Crown className="h-3 w-3 text-yellow-400" />}
                  <span className="text-xs text-slate-300">{m.user.username || m.user.seatId}</span>
                  {m.user.isVerified && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {!cik && (
          <div className="mb-6 p-4 rounded-2xl border border-slate-700/40 bg-slate-800/10 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-300">ЦИК не назначен</p>
              <p className="text-xs text-slate-500">Создатель должен назначить временный ЦИК для проведения первых выборов</p>
            </div>
          </div>
        )}

        {/* Elections list */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Активные и завершённые выборы
          </h2>

          {elections.length === 0 ? (
            <div className="text-center py-16 border border-slate-700/30 rounded-2xl">
              <Vote className="h-10 w-10 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-500 text-sm">Выборов пока нет</p>
              <p className="text-xs text-slate-600 mt-1">ЦИК объявит первые выборы в Хурал</p>
            </div>
          ) : (
            elections.map(e => (
              <ElectionCard
                key={e.id}
                election={e}
                onVote={handleVote}
                onRegister={(electionId) => setRegisterModal({ electionId })}
              />
            ))
          )}
        </div>

        {/* Register candidate modal */}
        {registerModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-bold text-white text-lg mb-4">Выдвижение кандидатуры</h3>
              <div className="mb-4">
                <label className="text-sm text-slate-300 mb-1.5 block">Предвыборная программа</label>
                <textarea
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  rows={4}
                  placeholder="Ваши цели и обещания гражданам..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setRegisterModal(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all"
                >
                  Отмена
                </button>
                <button
                  onClick={handleRegister}
                  disabled={registering}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                  Выдвинуться
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
