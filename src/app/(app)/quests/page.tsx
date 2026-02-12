'use client';

import { useState, useEffect, useCallback } from 'react';
import { Scroll, Clock, Coins, Trophy, Building2, Search, Plus, CheckCircle2, XCircle, Eye, Briefcase, Globe, Lock, Users } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

// ─── Types ──────────────────────────────────────────
interface OrgQuest {
  id: string;
  title: string;
  description: string;
  objectives: Array<{ description: string; completed: boolean }>;
  category: string;
  visibility: 'ORG_ONLY' | 'BRANCH' | 'PUBLIC';
  rewardAltan?: number;
  reputationGain?: number;
  deadline?: string;
  estimatedDuration?: number;
  status: string;
  progress: number;
  organization: { id: string; name: string; type: string; powerBranch?: string };
  creator: { id: string; username: string };
  assignee?: { id: string; username: string };
  createdAt: string;
}

const CATEGORIES = [
  'ALL', 'ADMINISTRATION', 'LAW', 'FINANCE', 'CHEMISTRY', 'PHYSICS',
  'ENGINEERING', 'EDUCATION', 'HEALTHCARE', 'TECHNOLOGY', 'AGRICULTURE', 'OTHER',
];

const VISIBILITY_LABELS: Record<string, { label: string; icon: typeof Globe }> = {
  PUBLIC: { label: 'Публичный', icon: Globe },
  BRANCH: { label: 'Ветвь', icon: Users },
  ORG_ONLY: { label: 'Только орг', icon: Lock },
};

// ─── Component ──────────────────────────────────────
export default function QuestsPage() {
  const [tab, setTab] = useState<'browse' | 'my' | 'create'>('browse');
  const [quests, setQuests] = useState<OrgQuest[]>([]);
  const [myQuests, setMyQuests] = useState<OrgQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Create form state
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [form, setForm] = useState({
    orgId: '',
    title: '',
    description: '',
    objectives: [''],
    category: 'ADMINISTRATION',
    visibility: 'ORG_ONLY' as 'ORG_ONLY' | 'BRANCH' | 'PUBLIC',
    rewardAltan: '',
    reputationGain: '',
    deadline: '',
    estimatedDuration: '',
  });

  // ─── Fetch browse tasks ──────────────────────────
  const fetchBrowse = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'ALL') params.set('category', category);
      if (search) params.set('search', search);
      const res = await api.get<{ data: OrgQuest[] }>(`/org-quests/browse?${params}`);
      setQuests(res.data || []);
    } catch {
      setQuests([]);
    }
    setLoading(false);
  }, [category, search]);

  const fetchMyTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<OrgQuest[]>('/org-quests/my');
      setMyQuests(Array.isArray(res) ? res : []);
    } catch {
      setMyQuests([]);
    }
    setLoading(false);
  }, []);

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await api.get<{ data: Array<{ id: string; name: string; type: string }> }>(
        '/unified-org/organizations?limit=50',
      );
      setOrgs(res.data || []);
    } catch {
      setOrgs([]);
    }
  }, []);

  useEffect(() => {
    if (tab === 'browse') fetchBrowse();
    else if (tab === 'my') fetchMyTasks();
    else if (tab === 'create') fetchOrgs();
  }, [tab, fetchBrowse, fetchMyTasks, fetchOrgs]);

  // ─── Accept Task ──────────────────────────────────
  const acceptTask = async (taskId: string) => {
    try {
      await api.put(`/org-quests/${taskId}/accept`);
      fetchBrowse();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ─── Create Task ──────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.orgId) { setError('Выберите организацию'); return; }
    if (!form.title.trim()) { setError('Введите название'); return; }

    try {
      await api.post(`/org-quests/org/${form.orgId}`, {
        title: form.title,
        description: form.description,
        objectives: form.objectives.filter(o => o.trim()).map(o => ({ description: o })),
        category: form.category,
        visibility: form.visibility,
        rewardAltan: form.rewardAltan ? parseFloat(form.rewardAltan) : undefined,
        reputationGain: form.reputationGain ? parseInt(form.reputationGain) : undefined,
        deadline: form.deadline || undefined,
        estimatedDuration: form.estimatedDuration ? parseInt(form.estimatedDuration) : undefined,
      });
      setForm({ orgId: '', title: '', description: '', objectives: [''], category: 'ADMINISTRATION',
        visibility: 'ORG_ONLY', rewardAltan: '', reputationGain: '', deadline: '', estimatedDuration: '' });
      setTab('my');
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ─── Helpers ──────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'ACCEPTED': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'IN_PROGRESS': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'SUBMITTED': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
      case 'COMPLETED': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'REJECTED': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30';
    }
  };

  const getCategoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      ADMINISTRATION: 'bg-blue-500/20 text-blue-300',
      LAW: 'bg-amber-500/20 text-amber-300',
      FINANCE: 'bg-green-500/20 text-green-300',
      CHEMISTRY: 'bg-cyan-500/20 text-cyan-300',
      PHYSICS: 'bg-violet-500/20 text-violet-300',
      ENGINEERING: 'bg-orange-500/20 text-orange-300',
      EDUCATION: 'bg-pink-500/20 text-pink-300',
      TECHNOLOGY: 'bg-indigo-500/20 text-indigo-300',
    };
    return colors[cat] || 'bg-zinc-500/20 text-zinc-300';
  };

  // ─── Task Card ────────────────────────────────────
  const TaskCard = ({ quest, showAccept = false }: { quest: OrgQuest; showAccept?: boolean }) => (
    <div className="group bg-zinc-800/60 border border-zinc-700/80 rounded-xl p-5 hover:border-purple-500/40 hover:bg-zinc-800/90 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/quests/${quest.id}`}
            className="text-lg font-semibold text-white group-hover:text-purple-400 transition truncate block"
          >
            {quest.title}
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <Building2 className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">{quest.organization.name}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getCategoryBadge(quest.category)}`}>
              {quest.category}
            </span>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(quest.status)}`}>
          {quest.status}
        </span>
      </div>

      {/* Description */}
      <p className="text-zinc-400 text-sm line-clamp-2 mb-3">{quest.description}</p>

      {/* Objectives */}
      <div className="space-y-1 mb-4">
        {quest.objectives.slice(0, 3).map((obj, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {obj.completed
              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              : <div className="w-3.5 h-3.5 rounded-full border border-zinc-600 flex-shrink-0" />
            }
            <span className={obj.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'}>
              {obj.description}
            </span>
          </div>
        ))}
        {quest.objectives.length > 3 && (
          <p className="text-xs text-zinc-500 ml-6">+{quest.objectives.length - 3} ещё...</p>
        )}
      </div>

      {/* Rewards & Info Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-700/60">
        <div className="flex items-center gap-3 text-sm">
          {quest.rewardAltan && (
            <div className="flex items-center gap-1 text-amber-400">
              <Coins className="w-3.5 h-3.5" />
              <span className="font-medium">{quest.rewardAltan}</span>
            </div>
          )}
          {quest.reputationGain && (
            <div className="flex items-center gap-1 text-blue-400">
              <Trophy className="w-3.5 h-3.5" />
              <span>+{quest.reputationGain}</span>
            </div>
          )}
          {quest.deadline && (
            <div className="flex items-center gap-1 text-zinc-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(quest.deadline).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
        </div>

        {showAccept && quest.status === 'OPEN' && !quest.assignee && (
          <button
            onClick={(e) => { e.preventDefault(); acceptTask(quest.id); }}
            className="px-3 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition"
          >
            Взять задачу
          </button>
        )}
      </div>

      {/* Progress */}
      {quest.progress > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Прогресс</span>
            <span>{quest.progress}%</span>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-purple-500 to-amber-400 h-1.5 rounded-full transition-all"
              style={{ width: `${quest.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="container max-w-7xl py-8 space-y-8 animate-in fade-in">
      {/* ── HEADER ── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Scroll className="text-purple-400 w-8 h-8" />
            Доска Задач
          </h1>
          <p className="text-zinc-400 mt-1">
            Создавайте и выполняйте задачи организаций — как квесты в RPG
          </p>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-2 border-b border-zinc-700 pb-2">
        {([
          { key: 'browse', label: 'Доступные', icon: Search },
          { key: 'my', label: 'Мои задачи', icon: Briefcase },
          { key: 'create', label: 'Создать задачу', icon: Plus },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition ${
              tab === key
                ? 'bg-purple-500/20 text-purple-300 border-b-2 border-purple-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      {/* ── BROWSE TAB ── */}
      {tab === 'browse' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Поиск задач..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    category === c
                      ? 'bg-purple-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                  }`}
                >
                  {c === 'ALL' ? 'Все' : c}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks grid */}
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto" />
              <p className="text-zinc-400 mt-4 text-sm">Загрузка задач...</p>
            </div>
          ) : quests.length === 0 ? (
            <div className="text-center py-16 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
              <Scroll className="w-14 h-14 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Нет доступных задач</h3>
              <p className="text-zinc-400 text-sm">Создайте первую задачу или проверьте позже</p>
              <button
                onClick={() => setTab('create')}
                className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition"
              >
                Создать задачу
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {quests.map((q) => <TaskCard key={q.id} quest={q} showAccept />)}
            </div>
          )}
        </div>
      )}

      {/* ── MY TASKS TAB ── */}
      {tab === 'my' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto" />
            </div>
          ) : myQuests.length === 0 ? (
            <div className="text-center py-16 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
              <Briefcase className="w-14 h-14 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">У вас нет активных задач</h3>
              <p className="text-zinc-400 text-sm">Найдите задачу на доске или создайте новую</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {myQuests.map((q) => <TaskCard key={q.id} quest={q} />)}
            </div>
          )}
        </div>
      )}

      {/* ── CREATE TASK TAB ── */}
      {tab === 'create' && (
        <form onSubmit={handleCreate} className="max-w-2xl space-y-6">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-400" />
              Новая задача
            </h2>

            {/* Organization */}
            <div>
              <label className="text-sm text-zinc-300 mb-1.5 block">Организация *</label>
              <select
                value={form.orgId}
                onChange={(e) => setForm({ ...form, orgId: e.target.value })}
                className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Выберите организацию...</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name} ({o.type})</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="text-sm text-zinc-300 mb-1.5 block">Название *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Например: Анализ химического состава образца"
                className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm text-zinc-300 mb-1.5 block">Описание</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Подробное описание задачи..."
                className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500 focus:ring-purple-500 focus:border-purple-500 resize-none"
              />
            </div>

            {/* Objectives */}
            <div>
              <label className="text-sm text-zinc-300 mb-1.5 block">Цели (чеклист)</label>
              {form.objectives.map((obj, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={obj}
                    onChange={(e) => {
                      const newObj = [...form.objectives];
                      newObj[i] = e.target.value;
                      setForm({ ...form, objectives: newObj });
                    }}
                    placeholder={`Цель ${i + 1}`}
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500"
                  />
                  {form.objectives.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, objectives: form.objectives.filter((_, j) => j !== i) })}
                      className="px-2 text-red-400 hover:text-red-300"
                    >✕</button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm({ ...form, objectives: [...form.objectives, ''] })}
                className="text-xs text-purple-400 hover:text-purple-300 mt-1"
              >
                + Добавить цель
              </button>
            </div>

            {/* Category + Visibility */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-300 mb-1.5 block">Категория</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm"
                >
                  {CATEGORIES.filter(c => c !== 'ALL').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-300 mb-1.5 block">Видимость</label>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm"
                >
                  <option value="ORG_ONLY">🔒 Только организация</option>
                  <option value="BRANCH">👥 Ветвь власти</option>
                  <option value="PUBLIC">🌐 Публичный</option>
                </select>
              </div>
            </div>

            {/* Rewards */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-300 mb-1.5 block">
                  <Coins className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                  Награда (ALTAN)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.rewardAltan}
                  onChange={(e) => setForm({ ...form, rewardAltan: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-300 mb-1.5 block">
                  <Trophy className="w-3.5 h-3.5 inline mr-1 text-blue-400" />
                  Репутация
                </label>
                <input
                  type="number"
                  value={form.reputationGain}
                  onChange={(e) => setForm({ ...form, reputationGain: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500"
                />
              </div>
            </div>

            {/* Deadline + Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-300 mb-1.5 block">Дедлайн</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-300 mb-1.5 block">Время (мин)</label>
                <input
                  type="number"
                  value={form.estimatedDuration}
                  onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })}
                  placeholder="60"
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20"
            >
              Создать задачу
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
