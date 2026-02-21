'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Users, ShieldCheck, Building2, Vote, Crown,
  CheckCircle2, Clock, Hash, Scale, Loader2,
  ArrowUpCircle, MapPin, Globe, Star, Activity,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/hooks/use-auth';

// ── Types ──────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  seatId: string;
  username?: string;
  email: string;
  role: string;
  isVerified: boolean;
  isLegalSubject: boolean;
  citizenType?: string;
  birthplace?: string;
  ethnicity?: string;
  clan?: string;
  indigenousStatus?: boolean;
  createdAt: string;

  // Hierarchy
  organizationId?: string;
  organization?: { id: string; name: string; type: string; level: number };
  seat?: { level: string };

  // Org memberships
  organizationMemberships?: {
    id: string;
    role: string;
    organization: { id: string; name: string; type: string; level: number };
  }[];

  // Elections
  khuralCandidacies?: {
    id: string;
    voteCount: number;
    election: { id: string; title: string; status: string; branch: string; toLevel: string };
  }[];

  // Wallet
  walletStatus?: string;
  walletPublicKey?: string;
}

// ── Level label ────────────────────────────────────────────────────────────

const LEVEL_INT_LABELS: Record<number, string> = {
  1: 'Арбан', 10: 'Зун', 100: 'Мьянган', 1000: 'Тумэн',
};
const levelLabel = (n?: number) => n !== undefined ? (LEVEL_INT_LABELS[n] ?? `Уровень ${n}`) : '—';

const BRANCH_META: Record<string, { color: string }> = {
  EXECUTIVE:   { color: 'text-blue-400' },
  LEGISLATIVE: { color: 'text-emerald-400' },
  JUDICIAL:    { color: 'text-purple-400' },
  BANKING:     { color: 'text-amber-400' },
};

const LEVEL_LABELS: Record<string, string> = {
  LEVEL_1: 'Семья', LEVEL_10: 'Арбан', LEVEL_100: 'Зун',
  LEVEL_1000: 'Мьянган', LEVEL_10000: 'Тумэн', REPUBLIC: 'Республика', CONFEDERATION: 'Хурал',
};

// ── Main ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<UserProfile>('/users/me')
      .then(setProfile)
      .catch(() => toast.error('Ошибка загрузки профиля'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) return null;

  const verificationBg  = profile.isVerified ? 'from-emerald-500/10 to-slate-900' : 'from-amber-500/10 to-slate-900';
  const orgs = profile.organizationMemberships ?? [];
  const candidacies = profile.khuralCandidacies ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Hero identity card */}
        <div className={`relative rounded-3xl border border-slate-700/40 bg-gradient-to-br ${verificationBg} p-6 mb-6 overflow-hidden`}>
          {/* Glow */}
          <div className={`absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl opacity-20 ${profile.isVerified ? 'bg-emerald-400' : 'bg-amber-400'}`} />

          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center border-2 border-amber-300/20 shadow-[0_0_30px_-10px_rgba(245,158,11,0.6)]">
                <span className="text-2xl font-bold text-black">
                  {(profile.username || profile.seatId).slice(0,2).toUpperCase()}
                </span>
              </div>
              {profile.isVerified && (
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-bold text-white truncate">
                  {profile.username || profile.seatId}
                </h1>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  profile.role === 'CREATOR' ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' :
                  profile.role === 'ADMIN'   ? 'text-purple-400 bg-purple-500/15 border-purple-500/30' :
                  'text-slate-400 bg-slate-500/15 border-slate-500/30'
                }`}>
                  {profile.role}
                </span>
                {profile.isVerified
                  ? <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">✓ Верифицирован</span>
                  : <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">⚠ Не верифицирован</span>
                }
              </div>
              <p className="text-xs font-mono text-slate-500 mb-3">{profile.seatId}</p>

              {/* Identity details */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                {profile.citizenType && (
                  <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {profile.citizenType}</span>
                )}
                {profile.birthplace && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.birthplace}</span>
                )}
                {profile.ethnicity && (
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {profile.ethnicity}</span>
                )}
                {profile.clan && (
                  <span className="flex items-center gap-1"><Star className="h-3 w-3" /> Клан: {profile.clan}</span>
                )}
                {profile.indigenousStatus && (
                  <span className="flex items-center gap-1 text-emerald-400"><ShieldCheck className="h-3 w-3" /> Коренной народ</span>
                )}
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                  Зарегистрирован {new Date(profile.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          </div>

          {/* Wallet status */}
          {profile.walletPublicKey && (
            <div className="mt-4 pt-4 border-t border-slate-700/30 flex items-center gap-2 text-xs">
              <Hash className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-mono text-slate-500 truncate">{profile.walletPublicKey.slice(0,20)}…</span>
              <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] border ${
                profile.walletStatus === 'UNLOCKED'
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
              }`}>
                {profile.walletStatus}
              </span>
            </div>
          )}
        </div>

        {/* Grid: orgs + elections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

          {/* Organizations */}
          <section className="rounded-2xl border border-slate-700/40 bg-slate-800/20 p-5">
            <h2 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              Организации
              <span className="ml-auto text-xs text-slate-500">{orgs.length}</span>
            </h2>
            {orgs.length === 0 ? (
              <div className="text-center py-6">
                <Building2 className="h-6 w-6 text-slate-600 mx-auto mb-1" />
                <p className="text-xs text-slate-500">Нет членства в организациях</p>
                <Link href="/organizations" className="text-[11px] text-blue-400 mt-1 flex items-center justify-center gap-1">
                  Найти организацию <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {orgs.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-700/30 bg-slate-800/20">
                    <div className="h-8 w-8 rounded-lg bg-slate-700/40 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{m.organization.name}</p>
                      <p className="text-[10px] text-slate-500">{levelLabel(m.organization.level)} · {m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Election candidacies */}
          <section className="rounded-2xl border border-slate-700/40 bg-slate-800/20 p-5">
            <h2 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Vote className="h-4 w-4 text-slate-400" />
              Кандидатуры в выборах
              <span className="ml-auto text-xs text-slate-500">{candidacies.length}</span>
            </h2>
            {candidacies.length === 0 ? (
              <div className="text-center py-6">
                <Vote className="h-6 w-6 text-slate-600 mx-auto mb-1" />
                <p className="text-xs text-slate-500">Не выдвигались</p>
                <Link href="/elections/khural" className="text-[11px] text-blue-400 mt-1 flex items-center justify-center gap-1">
                  Посмотреть выборы <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {candidacies.map(c => {
                  const branchColor = BRANCH_META[c.election.branch]?.color ?? 'text-slate-400';
                  return (
                    <div key={c.id} className="p-2.5 rounded-xl border border-slate-700/30 bg-slate-800/20">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold ${branchColor}`}>{c.election.branch}</span>
                        <span className="text-[9px] text-slate-500">→ {LEVEL_LABELS[c.election.toLevel]}</span>
                        <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full border ${
                          c.election.status === 'CERTIFIED' ? 'text-purple-400 border-purple-500/20 bg-purple-500/10' :
                          c.election.status === 'VOTING'    ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' :
                          'text-blue-400 border-blue-500/20 bg-blue-500/10'
                        }`}>{c.election.status}</span>
                      </div>
                      <p className="text-xs text-white truncate">{c.election.title}</p>
                      <p className="text-[10px] text-amber-400 mt-0.5 flex items-center gap-1">
                        <Vote className="h-2.5 w-2.5" /> {c.voteCount} голосов
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/governance',       icon: <Activity className="h-4 w-4" />,  label: 'Дашборд',   color: 'hover:border-blue-500/30 hover:text-blue-400' },
            { href: '/square',           icon: <Scale className="h-4 w-4" />,     label: 'Площадь',   color: 'hover:border-amber-500/30 hover:text-amber-400' },
            { href: '/elections/khural', icon: <Vote className="h-4 w-4" />,      label: 'Выборы',    color: 'hover:border-emerald-500/30 hover:text-emerald-400' },
            { href: '/judicial',         icon: <Scale className="h-4 w-4" />,     label: 'Суд',       color: 'hover:border-purple-500/30 hover:text-purple-400' },
          ].map(a => (
            <Link
              key={a.href}
              href={a.href}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-700/40 bg-slate-800/20 text-slate-400 ${a.color} transition-all text-xs font-medium`}
            >
              {a.icon}
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
