"use client";

import * as React from "react";
import {
  Shield, Wallet, Vote, Landmark, Users, Flag,
  Scale, Coins, ScrollText, Map, Building2, Briefcase,
  TrendingUp, ChevronRight, Star, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { CircularCouncil, type Member } from "@/components/governance";
import { cn } from "@/lib/utils";
import { getActiveElections, getPendingAdmissions } from "@/lib/api";

interface QuickLink {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  iconColor: string;
}

const GOVERN_LINKS: QuickLink[] = [
  {
    href: "/khural",
    title: "Хурал",
    description: "Государственная карта и структура",
    icon: Landmark,
    color: "hover:border-amber-500/30",
    iconColor: "text-amber-500 bg-amber-500/10",
  },
  {
    href: "/elections",
    title: "Выборы",
    description: "Активные голосования и кандидаты",
    icon: Vote,
    color: "hover:border-blue-500/30",
    iconColor: "text-blue-500 bg-blue-500/10",
  },
  {
    href: "/citizenship",
    title: "Гражданство",
    description: "Земельное право и допуск граждан",
    icon: Flag,
    color: "hover:border-emerald-500/30",
    iconColor: "text-emerald-500 bg-emerald-500/10",
  },
  {
    href: "/courts",
    title: "Суды",
    description: "Гражданское правоприменение",
    icon: Scale,
    color: "hover:border-purple-500/30",
    iconColor: "text-purple-500 bg-purple-500/10",
  },
];

const SERVICE_LINKS: QuickLink[] = [
  {
    href: "/wallet",
    title: "Кошелёк",
    description: "MPC-активы и подпись транзакций",
    icon: Wallet,
    color: "hover:border-gold-primary/30",
    iconColor: "text-gold-primary bg-gold-surface/20",
  },
  {
    href: "/treasury",
    title: "Центральный банк",
    description: "Денежная политика и эмиссия",
    icon: Coins,
    color: "hover:border-amber-500/30",
    iconColor: "text-amber-400 bg-amber-500/10",
  },
  {
    href: "/cooperatives",
    title: "Кооперативы",
    description: "Гильдии и производственные сети",
    icon: Briefcase,
    color: "hover:border-purple-500/30",
    iconColor: "text-purple-400 bg-purple-500/10",
  },
  {
    href: "/fund",
    title: "Суверенный фонд",
    description: "Инвестиции и ресурсы",
    icon: TrendingUp,
    color: "hover:border-blue-500/30",
    iconColor: "text-blue-400 bg-blue-500/10",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const isVerified = user?.status === 'VERIFIED' || user?.walletStatus === 'ACTIVE';

  // Live stats
  const [activeElections, setActiveElections] = React.useState(0);
  const [pendingAdmissions, setPendingAdmissions] = React.useState(0);

  React.useEffect(() => {
    getActiveElections().then(e => setActiveElections(e.length)).catch(() => {});
    getPendingAdmissions().then(a => setPendingAdmissions(a.length)).catch(() => {});
  }, []);

  // Mock Arban members (preserved — CircularCouncil is a unique UX element)
  const mockMembers: Member[] = [
    { id: 1, name: "Temujin", isActive: true, hasSigned: true, isLeader: true },
    { id: 2, name: "Borte", isActive: true, hasSigned: true },
    { id: 3, name: "Jochi", isActive: false, hasSigned: true },
    { id: 4, name: "Chagatai", isActive: true, hasSigned: false },
    { id: 5, name: "Ogedei", isActive: true, hasSigned: false },
    { id: 6, name: "Tolui", isActive: false, hasSigned: false },
    { id: 7, name: "Kublai", isActive: true, hasSigned: true },
    { id: 8, name: "Hulagu", isActive: false, hasSigned: false },
    { id: 9, name: "Mongke", isActive: true, hasSigned: false },
    { id: 10, name: "Batu", isActive: true, hasSigned: true },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Shield className="text-gold-primary w-8 h-8" />
            Центр управления
          </h2>
          <p className="text-zinc-400 mt-1">
            Добро пожаловать, {user?.address?.slice(0, 8)}...
          </p>
        </div>
        {isVerified && (
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-mono uppercase tracking-widest">
              Верифицирован
            </div>
          </div>
        )}
      </div>

      {/* Live Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-gold-border/30 bg-gradient-to-br from-zinc-900/80 to-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-surface/20">
                <Award className="h-5 w-5 text-gold-primary" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Роль</div>
                <div className="text-lg font-mono font-bold text-gold-primary">
                  {user?.role || 'CITIZEN'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Vote className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Активн. выборов</div>
                <div className="text-lg font-mono font-bold text-blue-500">
                  {activeElections}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Заявки</div>
                <div className="text-lg font-mono font-bold text-amber-500">
                  {pendingAdmissions}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <Wallet className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Кошелёк</div>
                <div className="text-lg font-mono font-bold text-emerald-500">
                  {user?.walletStatus === 'ACTIVE' ? 'Активен' : 'Не настроен'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Circular Council */}
      <div className="flex justify-center">
        <CircularCouncil
          level="ARBAN"
          members={mockMembers}
          onMemberClick={(m) => console.log('Member:', m)}
          showLeaderPanel={mockMembers[0]?.isLeader}
        />
      </div>

      {/* Governance Links */}
      <div>
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">
          Ветви власти
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {GOVERN_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className={cn(
                "border-white/5 bg-zinc-900/50 transition-all cursor-pointer h-full",
                link.color,
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0",
                      link.iconColor,
                    )}>
                      <link.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white flex items-center gap-1">
                        {link.title}
                        <ChevronRight className="h-4 w-4 text-zinc-600" />
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{link.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Services Links */}
      <div>
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">
          Экономика и сервисы
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICE_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className={cn(
                "border-white/5 bg-zinc-900/50 transition-all cursor-pointer h-full",
                link.color,
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0",
                      link.iconColor,
                    )}>
                      <link.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white flex items-center gap-1">
                        {link.title}
                        <ChevronRight className="h-4 w-4 text-zinc-600" />
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{link.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Verification Required Banner (for non-verified users) */}
      {!isVerified && (
        <Card className="border-gold-border/30 bg-gold-surface/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-surface/20 flex-shrink-0">
                <Shield className="h-6 w-6 text-gold-primary" />
              </div>
              <div>
                <h3 className="font-bold text-gold-primary text-lg mb-1">
                  Требуется верификация
                </h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Для участия в управлении, голосовании и экономических операциях
                  необходимо пройти полную верификацию гражданина.
                </p>
                <Link href="/wallet">
                  <Button className="bg-gold-primary/10 text-gold-primary hover:bg-gold-primary/20 border-gold-primary/20">
                    Начать верификацию
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
