"use client";

import * as React from "react";
import { useSeatBinding } from "@/lib/hooks/use-seat-binding";
import { ShieldCheck, ShieldAlert, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SeatBindingDialog } from "./seat-binding-dialog";


export function SeatStatus() {
  const { status, isLoading, error, refresh } = useSeatBinding();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isLoading && !status) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-white/5 text-xs text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading Identity...</span>
      </div>
    );
  }

  if (error) {
     return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/20 border border-red-900/50 text-xs text-red-400" title={error}>
           <ShieldAlert className="h-3 w-3" />
           <span>Auth Error</span>
           <button onClick={refresh} className="ml-1 hover:text-red-300"><RefreshCw className="h-3 w-3" /></button>
        </div>
     )
  }

  if (!status?.isBound) {
    return (
      <SeatBindingDialog>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/20 border border-amber-900/50 text-xs text-amber-500 cursor-pointer hover:bg-amber-950/40 transition-colors">
          <ShieldAlert className="h-3 w-3" />
          <span>Hardware Key Missing</span>
        </div>
      </SeatBindingDialog>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/20 border border-emerald-900/50 text-xs text-emerald-500 group cursor-help transition-all hover:bg-emerald-950/40">
      <ShieldCheck className="h-3 w-3" />
      <span className="font-mono">
        {status.seatId ? `SEAT-${status.seatId}` : "BOUND"}
      </span>
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
    </div>
  );
}
