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
  Lock,
  Unlock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { EmbeddedWallet } from "@/lib/wallet/embedded";

const NAV_ITEMS = [
  {
    category: "Identity (Soul)",
    items: [
      { name: "My Seat", href: "/dashboard", icon: ShieldCheck },
      { name: "My Family", href: "/family", icon: Users },
    ],
  },
  {
    category: "Legislative (Khural)",
    items: [
      { name: "State Map", href: "/khural", icon: Building2 }, // Tumen/Myangan/Zuun/Arban
      { name: "Archives", href: "/registries/history", icon: ScrollText },
    ],
  },
  {
    category: "Executive (Guilds)",
    items: [
      { name: "Quest Board", href: "/board", icon: Briefcase },
      { name: "Cooperatives", href: "/cooperatives", icon: Users },
    ],
  },
  {
    category: "Financial (Altan)",
    items: [
      { name: "Treasury", href: "/treasury", icon: Landmark },
      { name: "Exchange", href: "/exchange", icon: ArrowRightLeft },
      { name: "Sovereign Fund", href: "/fund", icon: Coins },
    ],
  },
  {
    category: "Judicial (Courts)",
    items: [
      { name: "Resolution", href: "/courts", icon: Scale },
    ],
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [walletStatus, setWalletStatus] = useState<'LOCKED' | 'UNLOCKED' | 'MISSING'>('MISSING');

  useEffect(() => {
    // Check wallet status on mount
    if (EmbeddedWallet.exists()) {
        const addr = EmbeddedWallet.getAddress();
        // In a real app we'd check if currently unlocked in memory
        setWalletStatus('LOCKED'); 
    }
  }, []);

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
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
          {NAV_ITEMS.map((section, idx) => (
            <div key={idx}>
              <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700/70 border-b border-amber-900/10 pb-1">
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
                        "group flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-all duration-300",
                        isActive
                          ? "bg-amber-950/40 text-amber-400 border-l-2 border-amber-500 shadow-[inset_10px_0_20px_-10px_rgba(245,158,11,0.1)]"
                          : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 hover:pl-4"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isActive ? "text-amber-500" : "text-zinc-600 group-hover:text-zinc-400"
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

        {/* Wallet Status Footer */}
        <div className="border-t border-amber-900/20 p-4 bg-black/40">
           <div className="flex items-center gap-3 mb-4 px-2">
              <div className={cn("h-2 w-2 rounded-full", walletStatus === 'UNLOCKED' ? "bg-green-500 shadow-[0_0_8px_green]" : "bg-amber-600 animate-pulse")} />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                {walletStatus === 'MISSING' ? 'No Wallet' : walletStatus}
              </span>
              {walletStatus !== 'UNLOCKED' && walletStatus !== 'MISSING' && (
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
        </div>
    </aside>
  );
}
