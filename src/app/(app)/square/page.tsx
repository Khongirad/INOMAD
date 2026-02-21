'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Megaphone, FileText, Scale, Lightbulb,
  ChevronUp, ChevronDown, ArrowUpCircle,
  Loader2, Plus, Users, X, Check,
  AlertTriangle,
} from 'lucide-react';
import {
  getSquarePosts, getTrendingPetitions, createSquarePost, voteSquarePost,
  LEVEL_LABELS,
  type SquarePost, type HierarchyLevel, type SquarePostType,
} from '@/lib/api/public-square';

// ── Constants ──────────────────────────────────────────────────────────────

const ALL_LEVELS: HierarchyLevel[] = [
  'LEVEL_10', 'LEVEL_100', 'LEVEL_1000', 'LEVEL_10000', 'REPUBLIC', 'CONFEDERATION',
];

const POST_TYPE_META: Record<SquarePostType, { label: string; icon: React.ReactNode; color: string }> = {
  DEBATE:       { label: 'Дебаты',     icon: <Scale className="h-3.5 w-3.5" />,     color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  PETITION:     { label: 'Петиция',    icon: <FileText className="h-3.5 w-3.5" />,  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  PROPOSAL:     { label: 'Инициатива', icon: <Lightbulb className="h-3.5 w-3.5" />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  ANNOUNCEMENT: { label: 'Объявление', icon: <Megaphone className="h-3.5 w-3.5" />, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
};

const STATUS_BADGE: Record<string, string> = {
  OPEN:        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  VOTING:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ESCALATED:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  LEGISLATIVE: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  CLOSED:      'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыто', VOTING: 'Голосование', ESCALATED: '⬆ Эскалировано', LEGISLATIVE: '🏛 В Хурале', CLOSED: 'Закрыто',
};

// ── Petition progress bar ──────────────────────────────────────────────────

function PetitionProgress({ post }: { post: SquarePost }) {
  if (post.postType !== 'PETITION' || post.requiredSupport === 0) return null;
  const pct = Math.min(100, Math.round((post.supportCount / post.requiredSupport) * 100));
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{post.supportCount} из {post.requiredSupport} подписей</span>
        <span className={pct >= 100 ? 'text-emerald-400 font-bold' : ''}>{pct}% → эскалация</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-700/60">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-emerald-400' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Create post modal ──────────────────────────────────────────────────────

function CreatePostModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    level: 'LEVEL_10' as HierarchyLevel,
    scopeId: 'default-arban',
    scopeName: 'Мой Арбан',
    postType: 'DEBATE' as SquarePostType,
    title: '',
    content: '',
    requiredSupport: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Заполните заголовок и содержание');
      return;
    }
    setLoading(true);
    try {
      await createSquarePost({
        ...form,
        requiredSupport: form.postType === 'PETITION' ? (form.requiredSupport || 5) : 0,
      });
      toast.success('Публикация создана');
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка публикации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white text-lg">Новая публикация</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          {/* Post type */}
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(POST_TYPE_META) as SquarePostType[]).map(t => (
              <button
                key={t}
                onClick={() => setForm(f => ({ ...f, postType: t }))}
                className={`p-3 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all ${
                  form.postType === t ? 'border-blue-500/60 bg-blue-500/10 text-white' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                {POST_TYPE_META[t].icon}
                {POST_TYPE_META[t].label}
              </button>
            ))}
          </div>

          {/* Level + Scope */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Уровень</label>
              <select
                value={form.level}
                onChange={e => setForm(f => ({ ...f, level: e.target.value as HierarchyLevel }))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500/60"
              >
                {ALL_LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Название места</label>
              <input
                type="text"
                value={form.scopeName}
                onChange={e => setForm(f => ({ ...f, scopeName: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Заголовок *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Краткое и ёмкое название проблемы или идеи"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 transition-all"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Содержание *</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={4}
              placeholder="Подробно опишите суть вопроса, проблему и предлагаемое решение..."
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 transition-all resize-none"
            />
          </div>

          {/* Petition threshold */}
          {form.postType === 'PETITION' && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Нужно подписей для эскалации (0 = авто по уровню)
              </label>
              <input
                type="number"
                min={0}
                value={form.requiredSupport}
                onChange={e => setForm(f => ({ ...f, requiredSupport: +e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500/60"
              />
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 font-semibold text-white transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Опубликовать
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Post card ──────────────────────────────────────────────────────────────

function PostCard({ post, onVote }: { post: SquarePost; onVote: () => void }) {
  const [voting, setVoting] = useState(false);
  const meta = POST_TYPE_META[post.postType];

  const handleVote = async (support: boolean) => {
    setVoting(true);
    try {
      await voteSquarePost(post.id, support);
      toast.success(support ? '✅ Поддержано' : 'Возражение зафиксировано');
      onVote();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка');
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="group p-5 rounded-2xl border border-slate-700/40 bg-slate-800/20 hover:bg-slate-800/40 hover:border-slate-600/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${meta.color}`}>
            {meta.icon}{meta.label}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_BADGE[post.status] || STATUS_BADGE.OPEN}`}>
            {STATUS_LABELS[post.status] || post.status}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            🗺 {LEVEL_LABELS[post.level]} · {post.scopeName}
          </span>
        </div>
      </div>

      {/* Title + content */}
      <h3 className="font-semibold text-white mb-1.5 line-clamp-2">{post.title}</h3>
      <p className="text-sm text-slate-400 line-clamp-3">{post.content}</p>

      {/* Petition progress */}
      <PetitionProgress post={post} />

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {post.author?.username || post.author?.seatId}
          </span>
          <span>{new Date(post.createdAt).toLocaleDateString('ru-RU')}</span>
        </div>

        {(post.status === 'OPEN' || post.status === 'VOTING') && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVote(false)}
              disabled={voting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700/50 text-slate-400 hover:border-red-500/40 hover:text-red-400 text-xs transition-all"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Против
            </button>
            <button
              onClick={() => handleVote(true)}
              disabled={voting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700/50 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/40 text-xs font-semibold transition-all"
            >
              {voting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronUp className="h-3.5 w-3.5" />}
              {post.supportCount} ↑
            </button>
          </div>
        )}

        {post.status === 'ESCALATED' && (
          <span className="text-xs text-orange-400 flex items-center gap-1">
            <ArrowUpCircle className="h-3.5 w-3.5" />
            Эскалировано выше
          </span>
        )}
        {post.status === 'LEGISLATIVE' && (
          <span className="text-xs text-purple-400 flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            Передано в Хурал
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function PublicSquarePage() {
  const [posts, setPosts] = useState<SquarePost[]>([]);
  const [trending, setTrending] = useState<SquarePost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [levelFilter, setLevelFilter] = useState<HierarchyLevel | ''>('');
  const [typeFilter, setTypeFilter] = useState<SquarePostType | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, trendingRes] = await Promise.all([
        getSquarePosts({
          level: levelFilter || undefined,
          postType: typeFilter || undefined,
        }),
        getTrendingPetitions(5),
      ]);
      setPosts(postsRes.data);
      setTotal(postsRes.total);
      setTrending(trendingRes);
    } catch {
      toast.error('Ошибка загрузки площади');
    } finally {
      setLoading(false);
    }
  }, [levelFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Народная площадь</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Дебаты и петиции</h1>
            <p className="text-slate-400 text-sm mt-1">
              От Арбана до Конфедерации — голос каждого гражданина эскалирует наверх
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-semibold transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="h-4 w-4" />
            Опубликовать
          </button>
        </div>

        {/* Escalation ladder info */}
        <div className="mb-6 p-4 rounded-2xl border border-slate-700/40 bg-slate-800/20">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">Лестница эскалации</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {ALL_LEVELS.map((l, i) => (
              <div key={l} className="flex items-center gap-1">
                <button
                  onClick={() => setLevelFilter(l === levelFilter ? '' : l)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    levelFilter === l
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                      : 'border-slate-700/40 text-slate-400 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {LEVEL_LABELS[l]}
                </button>
                {i < ALL_LEVELS.length - 1 && (
                  <span className="text-slate-600 text-xs">→</span>
                )}
              </div>
            ))}
            <span className="text-slate-600 text-xs">→</span>
            <span className="text-xs px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400">Хурал</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main feed */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {(Object.keys(POST_TYPE_META) as SquarePostType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t === typeFilter ? '' : t)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    typeFilter === t ? POST_TYPE_META[t].color + ' font-semibold' : 'border-slate-700/40 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {POST_TYPE_META[t].icon}
                  {POST_TYPE_META[t].label}
                </button>
              ))}
              {(levelFilter || typeFilter) && (
                <button
                  onClick={() => { setLevelFilter(''); setTypeFilter(''); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-700/40 text-slate-500 hover:text-white hover:border-slate-600 flex items-center gap-1 transition-all"
                >
                  <X className="h-3 w-3" /> Сбросить
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Пока никто не публиковал</p>
                <p className="text-xs mt-1 text-slate-600">Станьте первым — опубликуйте инициативу!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map(p => (
                  <PostCard key={p.id} post={p} onVote={load} />
                ))}
                <p className="text-center text-xs text-slate-600 pt-2">Всего: {total} публикаций</p>
              </div>
            )}
          </div>

          {/* Trending sidebar */}
          <div>
            <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 p-4 sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h3 className="font-semibold text-white text-sm">Горячие петиции</h3>
              </div>
              {trending.length === 0 ? (
                <p className="text-xs text-slate-500">Пока нет активных петиций</p>
              ) : (
                <div className="space-y-3">
                  {trending.map(p => {
                    const pct = p.requiredSupport > 0
                      ? Math.min(100, Math.round((p.supportCount / p.requiredSupport) * 100))
                      : 0;
                    return (
                      <div key={p.id} className="p-3 rounded-xl border border-slate-700/40 hover:bg-slate-700/20 cursor-pointer transition-all">
                        <p className="text-xs font-medium text-white line-clamp-2 mb-1">{p.title}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                          <span>{LEVEL_LABELS[p.level]}</span>
                          <span>{p.supportCount}/{p.requiredSupport}</span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-700/60">
                          <div
                            className="h-1 rounded-full bg-amber-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create modal */}
        {creating && (
          <CreatePostModal onClose={() => setCreating(false)} onCreated={load} />
        )}
      </div>
    </div>
  );
}
