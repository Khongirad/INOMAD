"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { SeatStatus } from "@/components/identity/seat-status";
import { useAuth } from "@/lib/hooks/use-auth";
import NotificationBell from "@/components/notifications/NotificationBell";

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Simple breadcrumb logic
  const getBreadcrumb = () => {
    if (pathname === "/dashboard" || pathname === "/") return "Cockpit Overview";
    const parts = pathname.split("/").filter(Boolean);
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" / ");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/5 bg-zinc-950/50 backdrop-blur-md px-6 lg:px-8">
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-medium text-zinc-400">
          {getBreadcrumb()}
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <div className="hidden md:block w-64">
           {/* Search placeholder */}
           <div className="relative">
             <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
             <input 
               className="h-9 w-full rounded-md border border-white/5 bg-white/5 pl-9 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-gold-primary/30 focus:outline-none"
               placeholder="Search records, ids..." 
             />
           </div>
        </div>

        <NotificationBell />

        <div className="h-8 w-[1px] bg-white/10 mx-1"></div>

        <div className="flex items-center gap-3">
           <SeatStatus />
           <div className="text-right hidden sm:block">
             <div className="text-sm font-medium text-zinc-200">{user?.seatId || 'Citizen'}</div>
             <div className="text-xs text-zinc-500">{user?.status === 'VERIFIED' ? 'Citizen Verified' : user?.status || 'Pending'}</div>
           </div>
           <div className="h-8 w-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-medium text-zinc-400">
             {user?.seatId ? user.seatId.substring(0, 2).toUpperCase() : '??'}
           </div>
        </div>
      </div>
    </header>
  );
}
