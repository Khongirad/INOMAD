"use client";

import * as React from "react";
import { User, Plus, Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SeatProps {
  id: string;
  idx?: number; // Position index
  status: "empty" | "occupied" | "locked";
  role?: "member" | "leader" | "elder";
  vote?: "for" | "against" | "abstain" | "pending";
  member?: {
    name: string;
    avatar?: string;
    level?: number;
    profession?: string;
  };
  isLoading?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function Seat({
  id,
  status,
  role = "member",
  vote,
  member,
  isLoading,
  isSelected,
  onClick,
  className,
  style,
}: SeatProps) {
  const isOccupied = status === "occupied";
  const isLeader = role === "leader";

  // Determine seat visuals based on state
  const ringColor = 
    isSelected ? "border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110" :
    vote === "for" ? "border-emerald-500 shadow-[0_0_15px_-3px_rgba(16,185,129,0.5)]" :
    vote === "against" ? "border-red-500 shadow-[0_0_15px_-3px_rgba(239,68,68,0.5)]" :
    vote === "abstain" ? "border-zinc-400" :
    isLeader ? "border-gold-primary shadow-[0_0_15px_-3px_var(--gold-glow)]" :
    isOccupied ? "border-zinc-600 hover:border-zinc-400" :
    "border-zinc-800 border-dashed hover:border-zinc-600";

  const bgStyle = 
    isSelected ? "bg-zinc-800" :
    vote === "for" ? "bg-emerald-950/50" :
    vote === "against" ? "bg-red-950/50" :
    isOccupied ? "bg-zinc-900" : 
    "bg-transparent";

  return (
    <div
      className={cn(
        "group absolute flex flex-col items-center justify-center transition-all duration-300",
        className
      )}
      style={{
        ...style,
        zIndex: isSelected ? 50 : undefined
      }}
      onClick={status !== "locked" && !isLoading ? onClick : undefined}
    >
      {/* SEAT RING */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full border-2 transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-sm",
          isLeader ? "h-16 w-16 md:h-20 md:w-20" : "h-12 w-12 md:h-14 md:w-14",
          ringColor,
          bgStyle,
          status === "locked" && "opacity-30 cursor-not-allowed",
          isLoading && "animate-pulse cursor-wait border-zinc-500"
        )}
      >
        {isLoading ? (
          <div className="h-4 w-4 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
        ) : isOccupied ? (
          member?.avatar ? (
            <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center">
               <User className={cn("text-zinc-400", isLeader ? "h-8 w-8 text-gold-primary" : "h-5 w-5")} />
            </div>
          )
        ) : (
          <Plus className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
        )}

        {/* CROWN FOR LEADER */}
        {isLeader && !isLoading && (
           <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-gold-primary filter drop-shadow-md">
             <Crown className="h-5 w-5 fill-current" />
           </div>
        )}
      </div>

      {/* NAME LABEL (HOVER or LEADER or SELECTED) */}
      <div 
        className={cn(
          "absolute -bottom-8 pointer-events-none transform transition-all duration-300 z-20",
          "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
          (isLeader || isSelected) && "opacity-100 translate-y-0"
        )}
      >
        <div className={cn(
          "bg-black/80 backdrop-blur border border-white/10 px-2 py-1 rounded text-[10px] whitespace-nowrap text-zinc-200 shadow-xl",
          isSelected && "border-white/30 bg-zinc-900"
        )}>
          {isLoading ? "Verifying..." : isOccupied ? member?.name : "Empty Seat"}
          {member?.profession && (
            <span className="block text-[9px] text-zinc-500 font-mono mt-0.5">{member.profession} Lvl {member.level || 1}</span>
          )}
        </div>
      </div>
      
      {/* VOTE INDICATOR ICON */}
      {vote && vote !== "pending" && !isLoading && (
        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-md z-10">
           <div className={cn("h-2 w-2 rounded-full", 
              vote === "for" ? "bg-emerald-500" :
              vote === "against" ? "bg-red-500" : "bg-white"
           )} />
        </div>
      )}
    </div>
  );
}
