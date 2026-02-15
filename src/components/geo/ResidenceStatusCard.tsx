"use client";

import { Home, Users, Globe } from "lucide-react";

import type { ResidenceStatus } from "@/app/(app)/identity/create/_core/geography";
import { getResidenceStatusLabel } from "@/app/(app)/identity/create/_core/geography";

// ─────────────────────────────────────────────────────────────────────────────
// ТИПЫ
// ─────────────────────────────────────────────────────────────────────────────

export interface ResidenceStatusCardProps {
  status: ResidenceStatus;
  regionName: string;
  nationName: string;
  className?: string;
  lang?: "en" | "ru";
}

// ─────────────────────────────────────────────────────────────────────────────
// УТИЛИТЫ
// ─────────────────────────────────────────────────────────────────────────────

function getStatusIcon(status: ResidenceStatus) {
  switch (status) {
    case "home":
      return Home;
    case "resident":
      return Users;
    case "guest":
      return Globe;
  }
}

function getStatusStyle(status: ResidenceStatus): string {
  switch (status) {
    case "home":
      return "border-emerald-500/30 bg-emerald-500/10";
    case "resident":
      return "border-blue-500/30 bg-blue-500/10";
    case "guest":
      return "border-amber-500/30 bg-amber-500/10";
  }
}

function getIconStyle(status: ResidenceStatus): string {
  switch (status) {
    case "home":
      return "text-emerald-400 bg-emerald-500/20";
    case "resident":
      return "text-blue-400 bg-blue-500/20";
    case "guest":
      return "text-amber-400 bg-amber-500/20";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────────────────────

export function ResidenceStatusCard({
  status,
  regionName,
  nationName,
  className = "",
  lang = "ru",
}: ResidenceStatusCardProps) {
  const Icon = getStatusIcon(status);
  const { label, description } = getResidenceStatusLabel(status, lang);

  const intro = {
    home: {
      ru: `How представитель peopleа ${nationName}, вы являетесь коренным жителем the region of ${regionName}.`,
      en: `As a member of the ${nationName} people, you are indigenous to the ${regionName} region.`,
    },
    resident: {
      ru: `How представитель peopleа ${nationName}, вы проживаете в regionе ${regionName} в статусе жителя.`,
      en: `As a member of the ${nationName} people, you reside in the ${regionName} region as a resident.`,
    },
    guest: {
      ru: `How представитель peopleа ${nationName}, вы проживаете в regionе ${regionName} в статусе гостя.`,
      en: `As a member of the ${nationName} people, you live in the ${regionName} region as a guest.`,
    },
  };

  const clarification = {
    ru: "Это не ограничение yourих прав. Это определяет распределение responseственности за землю.",
    en: "This is not a limitation of your rights. It defines the distribution of responsibility for the land.",
  };

  return (
    <div
      className={`glass-panel rounded-2xl overflow-hidden border ${getStatusStyle(
        status
      )} ${className}`}
    >
      {/* Header with icon */}
      <div className="p-5 flex items-start gap-4">
        <div className={`p-3 rounded-xl ${getIconStyle(status)}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
            {lang === "ru" ? "Your статус" : "Your Status"}
          </div>
          <h3 className="text-xl font-bold text-white">{label}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-5 space-y-4">
        {/* Introduction based on status */}
        <p className="text-sm text-zinc-300 leading-relaxed">
          {intro[status][lang]}
        </p>

        {/* Status description */}
        <div className="glass-card rounded-lg p-4 bg-black/20">
          <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
        </div>

        {/* Clarification */}
        <div className="flex items-start gap-2 text-xs text-zinc-500">
          <svg
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{clarification[lang]}</span>
        </div>
      </div>

      {/* Visual accent */}
      <div
        className="h-1"
        style={{
          background:
            status === "home"
              ? "linear-gradient(90deg, #10B981 0%, transparent 100%)"
              : status === "resident"
              ? "linear-gradient(90deg, #3B82F6 0%, transparent 100%)"
              : "linear-gradient(90deg, #F59E0B 0%, transparent 100%)",
        }}
      />
    </div>
  );
}

export default ResidenceStatusCard;
