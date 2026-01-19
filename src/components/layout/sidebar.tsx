"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  Scale,
  ScrollText,
  Users,
  Briefcase,
  ArrowRightLeft,
  Coins,
  ShieldCheck,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    category: "Overview",
    items: [
      { name: "Cockpit", href: "/dashboard", icon: LayoutDashboard },
      { name: "My Identity", href: "/identity/create", icon: ShieldCheck },
    ],
  },
  {
    category: "Institutions",
    items: [
      { name: "State Chancellery", href: "/khural", icon: Building2 },
      { name: "Central Bank", href: "/treasury", icon: Landmark },
      { name: "Courts", href: "/courts", icon: Scale },
      { name: "Registries", href: "/registries", icon: ScrollText },
    ],
  },
  {
    category: "Market",
    items: [
      { name: "Cooperatives", href: "/cooperatives", icon: Users },
      { name: "Board", href: "/board", icon: Briefcase },
      { name: "Exchange", href: "/exchange", icon: ArrowRightLeft },
      { name: "Sovereign Fund", href: "/fund", icon: Coins },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/5 bg-zinc-900/60 backdrop-blur-xl transition-transform">
      <div className="flex h-full flex-col">
        {/* Brand */}
        <div className="flex h-16 items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-300 to-yellow-600 shadow-[0_0_15px_-3px_rgba(212,175,55,0.3)]"></div>
            <span className="text-lg font-bold tracking-tight text-white">
              INOMAD
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
          {NAV_ITEMS.map((section, idx) => (
            <div key={idx}>
              <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                {section.category}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-gold-surface text-gold-primary shadow-[0_0_10px_-5px_var(--gold-glow)]"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isActive ? "text-gold-primary" : "text-zinc-500 group-hover:text-zinc-300"
                        )}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User /Footer */}
        <div className="border-t border-white/5 p-4">
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-100 transition-colors">
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-100 transition-colors">
            <LogOut className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      </div>
    </aside>
  );
}
