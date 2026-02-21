"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
}

export function Sheet({ open, onOpenChange, children, title }: SheetProps) {
  // Close on Escape key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onOpenChange]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-white/10 bg-zinc-950 p-6 shadow-2xl transition-transform duration-300 ease-in-out sm:max-w-lg",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {title || "Panel"}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="h-full overflow-y-auto pb-20">
          {children}
        </div>
      </div>
    </>
  );
}
