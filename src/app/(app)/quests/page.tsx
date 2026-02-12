'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Scroll, Clock, Coins, Trophy, Search, Plus, CheckCircle2, XCircle,
  Briefcase, Building2, MapPin, Filter, TrendingUp, Hammer,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ──────────────────────────────────────────
interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: Array<{ description: string; completed: boolean }>;
  category: string;
  rewardAltan: number;
  reputationGain: number;
  deadline?: string;
  estimatedDuration?: number;
  status: string;
  progress: number;
  taxAmount?: number;
  republicTaxAmount?: number;
  confederationTaxAmount?: number;
  giver: { id: string; username: string };
  taker?: { id: string; username: string };
  organization?: { id: string; name: string; type: string };
  republic?: { id: string; name: string; republicKey?: string };
  createdAt: string;
}

interface MarketStats {
  totalQuests: number;
  openQuests: number;
  completedQuests: number;
  totalVolumeAltan: number;
}

const CATEGORIES = [
  { value: 'ALL', label: 'Все', emoji: '📋' },
  { value: 'REPAIR', label: 'Ремонт', emoji: '🔧' },
  { value: 'CONSTRUCTION', label: 'Строительство', emoji: '🏗️' },
  { value: 'IT', label: 'IT', emoji: '💻' },
  { value: 'EDUCATION', label: 'Образование', emoji: '📚' },
  { value: 'DELIVERY', label: 'Доставка', emoji: '📦' },
  { value: 'LEGAL', label: 'Юридические', emoji: '⚖️' },
  { value: 'FINANCE', label: 'Финансы', emoji: '💰' },
  { value: 'HEALTHCARE', label: 'Здоровье', emoji: '🏥' },
  { value: 'AGRICULTURE', label: 'Сельское хоз.', emoji: '🌾' },
  { value: 'MANUFACTURING', label: 'Производство', emoji: '🏭' },
  { value: 'TRADE', label: 'Торговля', emoji: '🛒' },
  { value: 'DESIGN', label: 'Дизайн', emoji: '🎨' },
  { value: 'CONSULTING', label: 'Консалтинг', emoji: '💼' },
  { value: 'CLEANING', label: 'Клининг', emoji: '🧹' },
  { value: 'TRANSPORT', label: 'Транспорт', emoji: '🚛' },
  { value: 'OTHER', label: 'Другое', emoji: '📄' },
];

// ─── Component ──────────────────────────────────────
export default function QuestsPage() {
  const [tab, setTab] = useState<'market' | 'my' | 'create'>('market');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [myQuests, setMyQuests] = useState<Quest[]>([]);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    objectives: [''],
    category: 'OTHER',
    rewardAltan: '',
    reputationGain: '',
    deadline: '',
    estimatedDuration: '',
    organizationId: '',
  });

  // ─── Fetch marketplace ──────────────────────────
  const fetchMarket = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'ALL') params.set('category', category);
      if (search) params.set('search', search);
      const res = await api.get<{ data: Quest[]; pagination: any }>(`/quests?${params}`);
      setQuests(res.data || []);
    } catch {
      setQuests([]);
    }
    setLoading(false);
  }, [category, search]);

  const fetchMyQuests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Quest[]>('/quests/my');
      setMyQuests(Array.isArray(res) ? res : []);
    } catch {
      setMyQuests([]);
    }
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get<MarketStats>('/quests/stats');
      setStats(res);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchStats();
    if (tab === 'market') fetchMarket();
    else if (tab === 'my') fetchMyQuests();
  }, [tab, fetchMarket, fetchMyQuests, fetchStats]);

  // ─── Accept Quest ──────────────────────────────────
  const acceptQuest = async (questId: string) => {
    try {
      await api.post(`/quests/${questId}/accept`);
      setSuccess('Задание принято!');
      fetchMarket();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ─── Create Quest ──────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Введите название'); return; }
    if (!form.rewardAltan || parseFloat(form.rewardAltan) <= 0) {
      setError('Оплата в АЛТАН обязательна (минимум > 0)');
      return;
    }

    try {
      await api.post('/quests', {
        title: form.title,
        description: form.description,
        objectives: form.objectives.filter(o => o.trim()).map(o => ({ description: o })),
        category: form.category,
        rewardAltan: parseFloat(form.rewardAltan),
        reputationGain: form.reputationGain ? parseInt(form.reputationGain) : undefined,
        deadline: form.deadline || undefined,
        estimatedDuration: form.estimatedDuration ? parseInt(form.estimatedDuration) : undefined,
        organizationId: form.organizationId || undefined,
      });
      setForm({
        title: '', description: '', objectives: [''], category: 'OTHER',
        rewardAltan: '', reputationGain: '', deadline: '', estimatedDuration: '',
        organizationId: '',
      });
      setSuccess('Задание создано!');
      setTab('my');
      setTimeout(() => setSuccess(''), 3000);
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

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];

  // ─── Quest Card ────────────────────────────────────
  const QuestCard = ({ quest, showAccept = false }: { quest: Quest; showAccept?: boolean }) => {
    const catInfo = getCategoryInfo(quest.category);
    return (
      <div className="group bg-zinc-800/60 border border-zinc-700/80 rounded-xl p-5 hover:border-amber-500/40 hover:bg-zinc-800/90 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white group-hover:text-amber-300 transition truncate">
              {quest.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300">
                {catInfo.emoji} {catInfo.label}
              </span>
              {quest.organization && (
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <Building2 className="w-3 h-3" /> {quest.organization.name}
                </span>
              )}
              {quest.republic && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <MapPin className="w-3 h-3" /> {quest.republic.name}
                </span>
              )}
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${getStatusColor(quest.status)}`}>
            {quest.status}
          </span>
        </div>

        {/* Description */}
        <p className="text-zinc-400 text-sm line-clamp-2 mb-3">{quest.description}</p>

        {/* Objectives */}
        {quest.objectives?.length > 0 && (
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
        )}

        {/* Rewards & Info Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-700/60">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1 text-amber-400 font-semibold">
              <Coins className="w-4 h-4" />
              <span>{Number(quest.rewardAltan).toLocaleString()} ₳</span>
            </div>
            {quest.reputationGain > 0 && (
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

          {showAccept && quest.status === 'OPEN' && !quest.taker && (
            <button
              onClick={(e) => { e.preventDefault(); acceptQuest(quest.id); }}
              className="px-4 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition"
            >
              Взять работу
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
                className="bg-gradient-to-r from-amber-500 to-green-400 h-1.5 rounded-full transition-all"
                style={{ width: `${quest.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container max-w-7xl py-8 space-y-8 animate-in fade-in">
      {/* ── HEADER ── */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Hammer className="text-amber-400 w-8 h-8" />
          Рынок Труда
        </h1>
        <p className="text-zinc-400 mt-1">
          Создавайте и выполняйте задания — оплата в АЛТАН, репутация в республике
        </p>
      </div>

      {/* ── STATS BAR ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Всего заданий', value: stats.totalQuests, icon: Scroll, color: 'text-zinc-300' },
            { label: 'Открытые', value: stats.openQuests, icon: Search, color: 'text-green-400' },
            { label: 'Выполнено', value: stats.completedQuests, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Оборот (₳)', value: Number(stats.totalVolumeAltan).toLocaleString(), icon: TrendingUp, color: 'text-amber-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className="text-xs text-zinc-500">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TABS ── */}
      <div className="flex gap-2 border-b border-zinc-700 pb-2">
        {([
          { key: 'market', label: 'Рынок', icon: Search },
          { key: 'my', label: 'Мои задания', icon: Briefcase },
          { key: 'create', label: 'Создать', icon: Plus },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition ${
              tab === key
                ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── NOTIFICATIONS ── */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">✕</button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* ── MARKET TAB ── */}
      {tab === 'market' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="space-y-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Поиск заданий..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-amber-500 focus:border-amber-500 text-sm"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => setCategory(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    category === value
                      ? 'bg-amber-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quests grid */}
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto" />
              <p className="text-zinc-400 mt-4 text-sm">Загрузка заданий...</p>
            </div>
          ) : quests.length === 0 ? (
            <div className="text-center py-16 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
              <Hammer className="w-14 h-14 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Нет доступных заданий</h3>
              <p className="text-zinc-400 text-sm">Создайте первое задание или проверьте позже</p>
              <button
                onClick={() => setTab('create')}
                className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition"
              >
                Создать задание
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {quests.map((q) => <QuestCard key={q.id} quest={q} showAccept />)}
            </div>
          )}
        </div>
      )}

      {/* ── MY QUESTS TAB ── */}
      {tab === 'my' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto" />
            </div>
          ) : myQuests.length === 0 ? (
            <div className="text-center py-16 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
              <Briefcase className="w-14 h-14 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">У вас нет заданий</h3>
              <p className="text-zinc-400 text-sm">Найдите работу на рынке или создайте новое задание</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {myQuests.map((q) => <QuestCard key={q.id} quest={q} />)}
            </div>
          )}
        </div>
      )}

      {/* ── CREATE TAB ── */}
      {tab === 'create' && (
        <form onSubmit={handleCreate} className="max-w-2xl space-y-6">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              Новое задание
            </h2>

            {/* Title */}
            <div>
              <label className="text-sm text-zinc-300 mb-1.5 block">Название работы *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Например: Ремонт крыши, Разработка сайта, Доставка груза"
                className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm text-zinc-300 mb-1.5 block">Описание</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Подробное описание работы..."
                className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500 focus:ring-amber-500 focus:border-amber-500 resize-none"
              />
            </div>

            {/* Category + Payment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-300 mb-1.5 block">
                  <Filter className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                  Категория
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm"
                >
                  {CATEGORIES.filter(c => c.value !== 'ALL').map(({ value, label, emoji }) => (
                    <option key={value} value={value}>{emoji} {label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-300 mb-1.5 block">
                  <Coins className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                  Оплата в АЛТАН *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.rewardAltan}
                  onChange={(e) => setForm({ ...form, rewardAltan: e.target.value })}
                  placeholder="Обязательно"
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500"
                />
                {form.rewardAltan && parseFloat(form.rewardAltan) > 0 && (
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Налог 10%: {(parseFloat(form.rewardAltan) * 0.07).toFixed(2)} ₳ республика + {(parseFloat(form.rewardAltan) * 0.03).toFixed(2)} ₳ конфедерация
                  </p>
                )}
              </div>
            </div>

            {/* Objectives */}
            <div>
              <label className="text-sm text-zinc-300 mb-1.5 block">Этапы работы</label>
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
                    placeholder={`Этап ${i + 1}`}
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
                className="text-xs text-amber-400 hover:text-amber-300 mt-1"
              >
                + Добавить этап
              </button>
            </div>

            {/* Deadline + Duration + Reputation */}
            <div className="grid grid-cols-3 gap-4">
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
              <div>
                <label className="text-sm text-zinc-300 mb-1.5 block">
                  <Trophy className="w-3.5 h-3.5 inline mr-1 text-blue-400" />
                  Репутация
                </label>
                <input
                  type="number"
                  value={form.reputationGain}
                  onChange={(e) => setForm({ ...form, reputationGain: e.target.value })}
                  placeholder="50"
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20"
            >
              Создать задание
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
