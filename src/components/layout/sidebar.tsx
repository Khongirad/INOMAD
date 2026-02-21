"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Landmark,
  Scale,
  ScrollText,
  Users,
  Briefcase,
  ArrowRightLeft,
  Coins,
  ShieldCheck,
  Settings,
  Building2,
  Globe,
  LogOut,
  Shield,
  UserCog,
  Crown,
  MessageSquare,
  AlertTriangle,
  FileCheck,
  Handshake,
  TreePine,
  Vote,
  Receipt,
  Wallet,
  Flag,
  Megaphone,
  Activity,
  Gavel,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";

const NAV_ITEMS = [
  {
    category: "Identity (Soul)",
    items: [
      { name: "My Seat",   href: "/dashboard", icon: ShieldCheck },
      { name: "Profile",   href: "/profile",   icon: Users       },
      { name: "My Arbad",  href: "/arbad",     icon: Users       },
      { name: "Hierarchy", href: "/hierarchy", icon: TreePine    },
      { name: "My Family", href: "/family",    icon: Users       },
    ],
  },
  {
    category: "Governance",
    accent: "amber" as const,
    items: [
      { name: "State Dashboard", href: "/governance",        icon: Activity,  badge: "LIVE" },
      { name: "Public Square",   href: "/square",            icon: Megaphone  },
      { name: "Khural Elections",href: "/elections/khural",  icon: Vote        },
      { name: "Judicial Cases",  href: "/judicial",          icon: Gavel       },
    ],
  },
  {
    category: "Legislative (Khural)",
    items: [
      { name: "State Structure", href: "/state",             icon: Building2 },
      { name: "State Map",       href: "/khural",            icon: Globe     },
      { name: "Hierarchy",       href: "/hierarchy",         icon: TreePine  },
      { name: "Parliament",      href: "/parliament",        icon: Vote      },
      { name: "Territory",       href: "/territory",         icon: Globe     },
      { name: "Archives",        href: "/registries/history", icon: ScrollText },
    ],
  },
  {
    category: "Executive (Guilds)",
    items: [
      { name: "Quest Board",  href: "/quests",       icon: Briefcase },
      { name: "Cooperatives", href: "/cooperatives", icon: Users     },
    ],
  },
  {
    category: "Financial (Altan)",
    items: [
      { name: "Treasury",      href: "/treasury",    icon: Landmark       },
      { name: "Org Banking",   href: "/org-banking", icon: Wallet         },
      { name: "Exchange",      href: "/exchange",    icon: ArrowRightLeft  },
      { name: "Sovereign Fund",href: "/fund",        icon: Coins          },
      { name: "Tax Filing",    href: "/tax",         icon: Receipt        },
    ],
  },
  {
    category: "Judicial (Courts)",
    items: [
      { name: "Resolution",   href: "/courts",      icon: Scale         },
      { name: "Complaints",   href: "/complaints",  icon: AlertTriangle  },
      { name: "Disputes",     href: "/disputes",    icon: Handshake     },
      { name: "Chancellery",  href: "/chancellery", icon: Building2     },
    ],
  },
  {
    category: "Communication",
    items: [
      { name: "Messages", href: "/messages", icon: MessageSquare },
    ],
  },
  {
    category: "Organizations",
    items: [
      { name: "Leaderboard", href: "/organizations/leaderboard", icon: Crown      },
      { name: "Work Acts",   href: "/work-acts",                 icon: FileCheck  },
    ],
  },
  {
    category: "Government Services",
    items: [
      { name: "Migration",           href: "/services/migration",     icon: ScrollText },
      { name: "ZAGS (Civil Registry)",href: "/services/zags",         icon: Users      },
      { name: "Land Registry",       href: "/services/land-registry", icon: Building2  },
      { name: "Citizenship",         href: "/citizenship",            icon: Flag       },
    ],
  },
];

// ── Link helpers ──────────────────────────────────────────────────────────

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
};

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-all duration-300",
        isActive
          ? "bg-amber-950/40 text-amber-400 border-l-2 border-amber-500 shadow-[inset_10px_0_20px_-10px_rgba(245,158,11,0.1)]"
          : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 hover:pl-4"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 transition-colors flex-shrink-0",
          isActive ? "text-amber-500" : "text-zinc-600 group-hover:text-zinc-400"
        )}
      />
      <span className="flex-1">{item.name}</span>
      {item.badge && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 tracking-wider">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const walletStatus =
    user?.walletStatus === "UNLOCKED"
      ? "UNLOCKED"
      : user
      ? "LOCKED"
      : "MISSING";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-amber-900/20 bg-black/90 backdrop-blur-xl transition-transform flex flex-col">
      {/* Brand */}
      <div className="flex h-20 items-center px-6 border-b border-amber-900/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)] flex items-center justify-center border border-amber-300/20">
            <span className="text-black font-bold text-xs">SV</span>
          </div>
          <div>
            <span className="block text-lg font-bold tracking-widest text-amber-500 font-serif">
              INOMAD
            </span>
            <span className="block text-[10px] text-zinc-500 uppercase tracking-widest">
              Sovereign OS
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-amber-900/30">
        {NAV_ITEMS.map((section, idx) => (
          <div key={idx}>
            <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700/70 border-b border-amber-900/10 pb-1">
              {section.category}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname === item.href ||
                      (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <NavLink key={item.href} item={item as NavItem} isActive={isActive} />
                );
              })}
            </div>
          </div>
        ))}

        {/* Admin section */}
        {(user?.role === "ADMIN" || user?.role === "CREATOR") && (
          <div>
            <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-700/70 border-b border-purple-900/10 pb-1">
              Administration
            </div>
            <div className="space-y-1">
              {[
                { href: "/admin",       label: "Dashboard", Icon: Shield },
                { href: "/admin/users", label: "Users",     Icon: UserCog },
              ].map(({ href, label, Icon }) => {
                const isActive = pathname?.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-all duration-300",
                      isActive
                        ? "bg-purple-950/40 text-purple-400 border-l-2 border-purple-500 shadow-[inset_10px_0_20px_-10px_rgba(168,85,247,0.1)]"
                        : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 hover:pl-4"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-purple-500" : "text-zinc-600 group-hover:text-zinc-400")} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Creator section */}
        {user?.role === "CREATOR" && (
          <div>
            <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700/70 border-b border-amber-900/10 pb-1">
              Creator
            </div>
            <div className="space-y-1">
              {[
                { href: "/creator/admins",           label: "Manage Admins",    Icon: Crown },
                { href: "/creator/governance-status", label: "Governance Status", Icon: BarChart3 },
              ].map(({ href, label, Icon }) => {
                const isActive = pathname?.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-all duration-300",
                      isActive
                        ? "bg-amber-950/40 text-amber-400 border-l-2 border-amber-500 shadow-[inset_10px_0_20px_-10px_rgba(245,158,11,0.1)]"
                        : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 hover:pl-4"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-amber-500" : "text-zinc-600 group-hover:text-zinc-400")} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-amber-900/20 p-4 bg-black/40">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className={cn("h-2 w-2 rounded-full", walletStatus === "UNLOCKED" ? "bg-green-500 shadow-[0_0_8px_green]" : "bg-amber-600 animate-pulse")} />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            {walletStatus === "MISSING" ? "No Wallet" : walletStatus}
          </span>
          {walletStatus !== "UNLOCKED" && walletStatus !== "MISSING" && (
            <Link href="/identity/activation" className="ml-auto">
              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-amber-900/50 text-amber-500 hover:bg-amber-950">
                ACTIVATE
              </Button>
            </Link>
          )}
        </div>
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-colors">
          <Settings className="h-4 w-4" />
          Settings
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-red-950/30 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
