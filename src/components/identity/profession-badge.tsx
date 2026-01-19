"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Hammer, Briefcase, Scale, Stethoscope, Code, PenTool, Globe, Shield } from "lucide-react";

export type ProfessionType = 
  | "builder" 
  | "healer" 
  | "notary" 
  | "representative" 
  | "herder" 
  | "teacher" 
  | "engineer" 
  | "architect";

export interface ProfessionBadgeProps {
  profession: ProfessionType | string;
  level?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

const PROFESSION_ICONS: Record<string, React.ElementType> = {
  builder: Hammer,
  healer: Stethoscope,
  notary: Scale,
  representative: Briefcase,
  herder: Globe, // Fallback
  teacher: PenTool,
  engineer: Code,
  architect: Briefcase, // Fallback
  default: Shield
};

const LEVEL_VARIANTS = {
  wood: { min: 1, max: 9, color: "border-amber-900 bg-amber-950 text-amber-500", label: "Wood" },
  iron: { min: 10, max: 49, color: "border-zinc-500 bg-zinc-900 text-zinc-400", label: "Iron" },
  gold: { min: 50, max: 99, color: "border-yellow-500 bg-yellow-950 text-yellow-500", label: "Gold" },
  diamond: { min: 100, max: 999, color: "border-cyan-400 bg-cyan-950 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]", label: "Diamond" },
};

export function ProfessionBadge({ 
  profession, 
  level = 1, 
  size = "md", 
  className,
  showLabel = false 
}: ProfessionBadgeProps) {
  
  const normalizedProf = profession.toLowerCase();
  const Icon = PROFESSION_ICONS[normalizedProf] || PROFESSION_ICONS.default;
  
  // Determine variant based on level
  let variant = LEVEL_VARIANTS.wood;
  if (level >= 100) variant = LEVEL_VARIANTS.diamond;
  else if (level >= 50) variant = LEVEL_VARIANTS.gold;
  else if (level >= 10) variant = LEVEL_VARIANTS.iron;

  const sizeClasses = {
    sm: "h-6 w-6 p-1",
    md: "h-8 w-8 p-1.5",
    lg: "h-12 w-12 p-2.5"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-6 w-6"
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div 
        className={cn(
          "rounded flex items-center justify-center border bg-opacity-30 backdrop-blur-sm",
          variant.color,
          sizeClasses[size]
        )}
        title={`${profession} - Level ${level} (${variant.label} Rank)`}
      >
        <Icon className={cn(iconSizes[size], "fill-current opacity-80")} />
      </div>
      
      {showLabel && (
        <div className="flex flex-col leading-none">
          <span className="text-xs font-bold text-zinc-200 capitalize">{profession}</span>
          <span className="text-[10px] text-zinc-500">Lvl {level} • {variant.label}</span>
        </div>
      )}
    </div>
  );
}
