'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Vote, Users, CheckCircle2, ShieldCheck, Clock,
  Crown, Hash, Loader2, Plus, Scale, AlertCircle,
  ChevronRight, FileText, ArrowRight, ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────────────────

type HierarchyLevel = 'LEVEL_1'|'LEVEL_10'|'LEVEL_100'|'LEVEL_1000'|'LEVEL_10000'|'REPUBLIC'|'CONFEDERATION';
type Branch = 'EXECUTIVE'|'LEGISLATIVE'|'JUDICIAL'|'BANKING';
type ElectionStatus = 'NOMINATION'|'VOTING'|'CERTIFIED'|'CANCELLED';

interface KhuralElection {
  id: string;
  title: string;
  description?: string;
  fromLevel: HierarchyLevel;
  toLevel: HierarchyLevel;
  branch: Branch;
  scopeId: string;
  scopeName: string;
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
  type: 'PROVISIONAL'|'PERMANENT';
  status: 'ACTIVE'|'DISSOLVED';
  mandate?: string;
  members: {
    id: string;
    role: string;
    user: { seatId: string; username?: string; isVerified: boolean };
  }[];
}

// ── Meta ──────────────────────────────────────────────────────────────────

const LADDER: { from: HierarchyLevel; to: HierarchyLevel; label: string }[] = [
  { from: 'LEVEL_1',    to: 'LEVEL_10',      label: 'Семья → Арбан' },
  { from: 'LEVEL_10',   to: 'LEVEL_100',     label: 'Арбан → Зун' },
  { from: 'LEVEL_100',  to: 'LEVEL_1000',    label: 'Зун → Мьянган' },
  { from: 'LEVEL_1000', to: 'LEVEL_10000',   label: 'Мьянган → Тумэн' },
  { from: 'LEVEL_10000',to: 'REPUBLIC',      label: 'Тумэн → Республика' },
  { from: 'REPUBLIC',   to: 'CONFEDERATION', label: 'Республика → Хурал' },
];

const BRANCHES: { key: Branch; label: string; color: string; icon: string }[] = [
  { key: 'EXECUTIVE',   label: 'Исполнительная', color: 'blue',   icon: '🏛' },
  { key: 'LEGISLATIVE', label: 'Законодательная', color: 'emerald',icon: '⚖️' },
  { key: 'JUDICIAL',    label: 'Судебная',        color: 'purple', icon: '⚖️' },
  { key: 'BANKING',     label: 'Экономика / ЦБ',  color: 'amber',  icon: '🏦' },
];

const STATUS_COLOR: Record<ElectionStatus, string> = {
  NOMINATION: 'text-blue-400   bg-blue-500/10   border-blue-500/20',
  VOTING:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  CERTIFIED:  'text-purple-400 bg-purple-500/10 border-purple-500/20',
  CANCELLED:  'text-slate-400  bg-slate-500/10  border-slate-500/20',
};
const STATUS_LABEL: Record<ElectionStatus, string> = {
  NOMINATION: 'Выдвижение', VOTING: '🗳 Голосование', CERTIFIED: '✅ Заверено', CANCELLED: 'Отменено',
};

const BRANCH_COLOR_MAP: Record<string, string> = {
  blue:    'border-blue-500/30   bg-blue-500/5',
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
  purple:  'border-purple-500/30 bg-purple-500/5',
  amber:   'border-amber-500/30  bg-amber-500/5',
};
const BRANCH_BADGE: Record<string, string> = {
  blue:    'text-blue-400   bg-blue-500/15   border-blue-500/25',
  emerald: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25',
  purple:  'text-purple-400 bg-purple-500/15 border-purple-500/25',
  amber:   'text-amber-400  bg-amber-500/15  border-amber-500/25',
};

// ── Compact election cell (for ladder grid view) ──────────────────────────

function ElectionCell({
  election,
  branchColor,
  onVote,
  onRegister,
}: {
  election?: KhuralElection;
  branchColor: string;
  onVote: (electionId: string, candidateId: string) => void;
  onRegister: (electionId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!election) {
    return (
      <div className="h-16 rounded-xl border border-dashed border-slate-700/40 flex items-center justify-center">
        <span className="text-[10px] text-slate-600">—</span>
      </div>
    );
  }

  const winner = election.candidates[0];

  return (
    <div className={`rounded-xl border ${BRANCH_COLOR_MAP[branchColor]} p-2.5 cursor-pointer`}
         onClick={() => setExpanded(e => !e)}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUS_COLOR[election.status]}`}>
          {STATUS_LABEL[election.status]}
        </span>
        <span className="text-[9px] text-slate-500">{election._count.ballots}🗳</span>
      </div>
      <p className="text-[10px] text-slate-300 font-medium line-clamp-1">{election.scopeName}</p>

      {election.status === 'CERTIFIED' && winner && (
        <p className="text-[9px] text-emerald-400 mt-0.5 flex items-center gap-0.5">
          <Crown className="h-2.5 w-2.5" />
          {winner.candidate.username || winner.candidate.seatId}
        </p>
      )}

      {expanded && (
        <div className="mt-2 space-y-1 border-t border-slate-700/30 pt-2">
          {election.candidates.slice(0, 3).map((c, i) => (
            <div key={c.id} className="flex items-center gap-1.5 text-[10px]">
              <span className="text-slate-500 w-3">{i+1}.</span>
              <span className="text-slate-300 flex-1 truncate">{c.candidate.username || c.candidate.seatId}</span>
              <span className="text-slate-400 font-bold">{c.voteCount}</span>
              {election.status === 'VOTING' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onVote(election.id, c.candidateId); }}
                  className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px]"
                >
                  ↑
                </button>
              )}
            </div>
          ))}
          {(election.status === 'NOMINATION' || election.status === 'VOTING') && (
            <button
              onClick={(e) => { e.stopPropagation(); onRegister(election.id); }}
              className="w-full text-[9px] py-0.5 rounded border border-blue-500/30 text-blue-400 text-center mt-1"
            >
              + Выдвинуться
            </button>
          )}
          {election.resultHash && (
            <p className="text-[9px] font-mono text-slate-600 truncate">{election.resultHash.slice(0,24)}…</p>
          )}
        </div>
      )}
      <ChevronDown className={`h-3 w-3 text-slate-600 mx-auto mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function KhuralElectionsPage() {
  const [cik, setCik] = useState<CIK | null>(null);
  const [elections, setElections] = useState<KhuralElection[]>([]);
  const [loading, setLoading] = useState(true);
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
      toast.success(`✅ Голос принят · Merkle: ${result.merkleLeaf.slice(0, 12)}…`);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка');
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
      toast.error(e?.message || 'Ошибка');
    } finally {
      setRegistering(false);
    }
  };

  // Build lookup: [fromLevel][toLevel][branch] → election
  const byRungBranch = (fromLevel: HierarchyLevel, toLevel: HierarchyLevel, branch: Branch) =>
    elections.find(e => e.fromLevel === fromLevel && e.toLevel === toLevel && e.branch === branch);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="h-5 w-5 text-purple-400" />
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">ЦИК · Выборы</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Лестница выборов Хурала</h1>
          <p className="text-slate-400 text-sm mt-1">
            Лидеры каждого уровня избирают управляющих следующего — отдельно по каждой ветви власти
          </p>
        </div>

        {/* CIK panel */}
        {cik ? (
          <div className={`mb-6 p-4 rounded-2xl border ${
            cik.type === 'PROVISIONAL' ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className={`h-4 w-4 ${cik.type === 'PROVISIONAL' ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span className={`text-sm font-semibold ${cik.type === 'PROVISIONAL' ? 'text-amber-300' : 'text-emerald-300'}`}>
                {cik.type === 'PROVISIONAL' ? '⚡ Временный ЦИК' : '🏛 Постоянный ЦИК'}
              </span>
              {cik.mandate && <span className="text-xs text-slate-400 ml-2">· {cik.mandate}</span>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {cik.members.map(m => (
                <span key={m.id} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300">
                  {m.role === 'CHAIR' && <Crown className="h-3 w-3 text-yellow-400" />}
                  {m.user.username || m.user.seatId}
                  {m.user.isVerified && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-2xl border border-slate-700/40 bg-slate-800/10 flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-slate-500" />
            <p className="text-sm text-slate-400">ЦИК не назначен — Создатель должен назначить временный ЦИК</p>
          </div>
        )}

        {/* Constitution principle banner */}
        <div className="mb-6 p-3 rounded-xl border border-slate-700/30 bg-slate-800/10">
          <p className="text-xs text-slate-400 text-center">
            <span className="font-semibold text-slate-300">Конституционный принцип:</span>{' '}
            Граждане уровня N выбирают из лидеров-кандидатов уровня N.
            Победитель управляет ветвью власти уровня N+1. Каждая ветвь — отдельные выборы.
          </p>
        </div>

        {/* Ladder grid */}
        <div className="overflow-x-auto">
          {/* Column headers: Branches */}
          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '160px repeat(4, 1fr)' }}>
            <div />
            {BRANCHES.map(b => (
              <div key={b.key} className={`text-center py-2 rounded-xl border text-xs font-bold ${BRANCH_BADGE[b.color]}`}>
                {b.icon} {b.label}
              </div>
            ))}
          </div>

          {/* Rows: each rung of the ladder */}
          {LADDER.map((rung, i) => (
            <div key={rung.from} className="grid gap-2 mb-2" style={{ gridTemplateColumns: '160px repeat(4, 1fr)' }}>
              {/* Row label */}
              <div className="flex flex-col items-end justify-center pr-3">
                <span className="text-xs font-bold text-white text-right">{rung.label}</span>
                {i < LADDER.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600 mt-1 ml-auto" />
                )}
              </div>
              {/* 4 branch cells */}
              {BRANCHES.map(b => (
                <ElectionCell
                  key={b.key}
                  election={byRungBranch(rung.from, rung.to, b.key)}
                  branchColor={b.color}
                  onVote={handleVote}
                  onRegister={(electionId) => setRegisterModal({ electionId })}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {elections.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Vote className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Выборов пока нет</p>
            <p className="text-xs mt-1 text-slate-600">ЦИК объявит выборы по каждой ветви и каждому уровню</p>
          </div>
        )}

        {/* Register candidate modal */}
        {registerModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-bold text-white text-lg mb-4">Выдвижение кандидатуры</h3>
              <textarea
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                rows={4}
                placeholder="Ваша предвыборная программа..."
                className="w-full px-4 py-3 mb-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 resize-none"
              />
              <div className="flex gap-3">
                <button onClick={() => setRegisterModal(null)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">Отмена</button>
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
