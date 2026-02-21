'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Gavel, Scale, Clock, CheckCircle2, AlertTriangle,
  ArrowUpCircle, Plus, ChevronDown, Loader2, Hash,
  Users, Building2, ChevronRight, FileText,
} from 'lucide-react';
import { api } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────────────────

type CaseStatus = 'FILED'|'ACCEPTED'|'HEARING'|'VERDICT_ISSUED'|'CLOSED'|'APPEALED';
type VerdictType = 'GUILTY'|'NOT_GUILTY'|'DISMISSED'|'SETTLED';

interface JudicialCase {
  id: string;
  title: string;
  description: string;
  status: CaseStatus;
  level: string;
  filedAt: string;
  plaintiff: { seatId: string; username?: string };
  defendant?: { seatId: string; username?: string };
  defendantOrgName?: string;
  judge?: { seatId: string; username?: string };
  verdicts?: { verdict: VerdictType; reasoning: string; verdictHash: string; issuedAt: string; penalty?: string }[];
  _count?: { hearings: number; verdicts: number };
}

// ── Meta ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<CaseStatus, { label: string; color: string }> = {
  FILED:          { label: 'Подано',        color: 'text-blue-400   bg-blue-500/10   border-blue-500/20'    },
  ACCEPTED:       { label: 'Принято',       color: 'text-amber-400  bg-amber-500/10  border-amber-500/20'   },
  HEARING:        { label: 'Слушания',      color: 'text-orange-400 bg-orange-500/10 border-orange-500/20'  },
  VERDICT_ISSUED: { label: 'Приговор',      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20'  },
  CLOSED:         { label: 'Закрыто',       color: 'text-slate-400  bg-slate-500/10  border-slate-500/20'   },
  APPEALED:       { label: 'Апелляция',     color: 'text-red-400    bg-red-500/10    border-red-500/20'     },
};

const VERDICT_COLOR: Record<VerdictType, string> = {
  GUILTY:     'text-red-400 bg-red-500/10 border-red-500/20',
  NOT_GUILTY: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  DISMISSED:  'text-slate-400 bg-slate-500/10 border-slate-500/20',
  SETTLED:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const LEVEL_LABELS: Record<string, string> = {
  LEVEL_1: 'Семья', LEVEL_10: 'Арбан', LEVEL_100: 'Зун',
  LEVEL_1000: 'Мьянган', LEVEL_10000: 'Тумэн', REPUBLIC: 'Республика', CONFEDERATION: 'Хурал',
};

// ── Case card ──────────────────────────────────────────────────────────────

function CaseCard({ c }: { c: JudicialCase }) {
  const [expanded, setExpanded] = useState(false);
  const sm = STATUS_META[c.status];
  const verdict = c.verdicts?.[0];

  return (
    <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 overflow-hidden">
      <button className="w-full text-left p-5" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sm.color}`}>{sm.label}</span>
              <span className="text-xs text-slate-500">{LEVEL_LABELS[c.level] ?? c.level}</span>
              {c._count && (
                <span className="text-[10px] text-slate-600">{c._count.hearings} слушаний</span>
              )}
            </div>
            <h3 className="font-semibold text-white text-sm">{c.title}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {c.plaintiff.username || c.plaintiff.seatId}
                <span className="text-slate-600">→</span>
                {c.defendant
                  ? (c.defendant.username || c.defendant.seatId)
                  : (c.defendantOrgName || '—')}
              </span>
              {c.judge && (
                <span className="flex items-center gap-1">
                  <Scale className="h-3 w-3" />
                  {c.judge.username || c.judge.seatId}
                </span>
              )}
              <span className="ml-auto flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(c.filedAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-500 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-700/30 space-y-4 pt-4">
          <p className="text-sm text-slate-400 leading-relaxed">{c.description}</p>
          {verdict && (
            <div className={`p-4 rounded-xl border ${VERDICT_COLOR[verdict.verdict]}`}>
              <div className="flex items-center gap-2 mb-2">
                <Gavel className="h-4 w-4" />
                <span className="text-sm font-bold">
                  {verdict.verdict === 'GUILTY'     ? 'Виновен'       :
                   verdict.verdict === 'NOT_GUILTY' ? 'Не виновен'    :
                   verdict.verdict === 'DISMISSED'  ? 'Дело закрыто'  : 'Мировое соглашение'}
                </span>
                <span className="text-[10px] ml-auto font-mono opacity-60">{verdict.verdictHash.slice(0,16)}…</span>
              </div>
              <p className="text-xs leading-relaxed opacity-80">{verdict.reasoning}</p>
              {verdict.penalty && (
                <p className="text-xs mt-1 font-semibold">⚖ Наказание: {verdict.penalty}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

const LEVELS = ['LEVEL_10','LEVEL_100','LEVEL_1000','LEVEL_10000','REPUBLIC','CONFEDERATION'];

export default function JudicialPage() {
  const [cases, setCases] = useState<JudicialCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [defendantId, setDefendantId] = useState('');
  const [defendantOrgName, setDefendantOrgName] = useState('');
  const [evidence, setEvidence] = useState('');
  const [level, setLevel] = useState<string>('LEVEL_10');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<JudicialCase[]>('/judicial/cases' + (statusFilter ? `?status=${statusFilter}` : ''));
      setCases(Array.isArray(res) ? res : []);
    } catch { toast.error('Ошибка загрузки дел'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const submit = async () => {
    if (!title || !description || !level) {
      toast.error('Заполните обязательные поля');
      return;
    }
    if (!defendantId && !defendantOrgName) {
      toast.error('Укажите ответчика (гражданин или организация)');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/judicial/cases', {
        title, description, evidence: evidence || undefined,
        defendantId: defendantId || undefined,
        defendantOrgName: defendantOrgName || undefined,
        level,
      });
      toast.success('Иск подан');
      setShowModal(false);
      setTitle(''); setDescription(''); setDefendantId(''); setDefendantOrgName('');
      load();
    } catch (e: any) { toast.error(e?.message || 'Ошибка'); }
    finally { setSubmitting(false); }
  };

  const counts: Record<CaseStatus, number> = {
    FILED: 0, ACCEPTED: 0, HEARING: 0, VERDICT_ISSUED: 0, CLOSED: 0, APPEALED: 0,
  };
  for (const c of cases) counts[c.status] = (counts[c.status] ?? 0) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Gavel className="h-5 w-5 text-purple-400" />
              <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Судебная система</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Судебные дела</h1>
            <p className="text-slate-400 text-sm mt-1">
              Гражданин может подать иск против другого гражданина или организации
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all"
          >
            <Plus className="h-4 w-4" /> Подать иск
          </button>
        </div>

        {/* Status filter bar */}
        <div className="flex gap-2 flex-wrap mb-6">
          {(['', ...Object.keys(STATUS_META)] as const).map(s => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                statusFilter === s
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'border-slate-700/40 text-slate-400 hover:border-slate-600 hover:text-white'
              }`}
            >
              {s === '' ? 'Все' : STATUS_META[s as CaseStatus].label}
              {s && counts[s as CaseStatus] > 0 && (
                <span className="ml-1.5 text-[9px] bg-slate-700 px-1 rounded">{counts[s as CaseStatus]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Case list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-700/40 rounded-2xl">
            <Gavel className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Нет судебных дел</p>
            <p className="text-slate-600 text-sm mt-1">Подайте иск, чтобы начать разбирательство</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map(c => <CaseCard key={c.id} c={c} />)}
          </div>
        )}
      </div>

      {/* File case modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-5">
              <Gavel className="h-5 w-5 text-purple-400" />
              <h3 className="font-bold text-white text-lg">Подать судебный иск</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Название дела *</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 text-sm"
                  placeholder="Краткое описание спора" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Суть искового заявления *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 text-sm resize-none"
                  placeholder="Подробное описание нарушения и требований..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Ответчик (userId)</label>
                  <input value={defendantId} onChange={e => setDefendantId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 text-xs"
                    placeholder="UUID гражданина" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Или организация</label>
                  <input value={defendantOrgName} onChange={e => setDefendantOrgName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 text-xs"
                    placeholder="Название организации" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Уровень суда *</label>
                <select value={level} onChange={e => setLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500/60 text-sm">
                  {LEVELS.map(l => (
                    <option key={l} value={l}>{LEVEL_LABELS[l] ?? l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Доказательства (URL / хеш)</label>
                <input value={evidence} onChange={e => setEvidence(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 text-xs"
                  placeholder="https://… или sha256 хеш" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all text-sm">
                Отмена
              </button>
              <button onClick={submit} disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold transition-all flex items-center justify-center gap-2 text-sm">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
                Подать иск
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
