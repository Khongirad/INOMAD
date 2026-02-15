"use client";

import { X, Users, MapPin, Languages, BookOpen, Sparkles } from "lucide-react";

import type { Nation } from "@/app/(app)/identity/create/_core/geography";
import { getRegionById } from "@/app/(app)/identity/create/_core/geography";

// ─────────────────────────────────────────────────────────────────────────────
// ТИПЫ
// ─────────────────────────────────────────────────────────────────────────────

export interface NationCardProps {
  nation: Nation;
  onClose?: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
  className?: string;
  lang?: "en" | "ru";
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────────────────────

export function NationCard({
  nation,
  onClose,
  onSelect,
  isSelected = false,
  className = "",
  lang = "ru",
  compact = false,
}: NationCardProps) {
  const name = lang === "ru" ? nation.nameRu : nation.name;
  const history = lang === "ru" ? nation.historyRu : nation.history;
  const culture = lang === "ru" ? nation.cultureRu : nation.culture;
  const traditions = lang === "ru" ? nation.traditionsRu : nation.traditions;

  // Genderучаем названия regions
  const regionNames = nation.regions
    .map((regionId) => {
      const region = getRegionById(regionId);
      return region ? (lang === "ru" ? region.nameRu : region.name) : null;
    })
    .filter(Boolean);

  if (compact) {
    return (
      <button
        onClick={onSelect}
        className={`glass-card rounded-xl p-4 text-left transition w-full ${
          isSelected
            ? "border-2 border-gold-border bg-gold-dim/10 shadow-[0_0_20px_-5px_var(--gold-glow)]"
            : "border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30"
        } ${className}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">{name}</h3>
              {nation.isIndigenous && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {lang === "ru" ? "Indigenous" : "Indigenous"}
                </span>
              )}
            </div>
            {nation.nativeName && nation.nativeName !== name && (
              <div className="text-sm text-zinc-500 mt-0.5">
                {nation.nativeName}
              </div>
            )}
          </div>
          {isSelected && (
            <div className="w-5 h-5 rounded-full bg-gold-border flex items-center justify-center">
              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Languages */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {nation.languages.slice(0, 2).map((language) => (
            <span
              key={language}
              className="text-xs px-1.5 py-0.5 rounded bg-zinc-800/50 text-zinc-400"
            >
              {language}
            </span>
          ))}
        </div>

        {/* Region hint */}
        {regionNames.length > 0 && (
          <div className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {regionNames.slice(0, 2).join(", ")}
          </div>
        )}
      </button>
    );
  }

  return (
    <div
      className={`glass-panel rounded-2xl overflow-hidden ${className}`}
      style={{ maxWidth: "480px" }}
    >
      {/* Header */}
      <div className="p-5 border-b border-zinc-800/50 bg-gradient-to-br from-zinc-800/30 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {nation.isIndigenous && (
                <span className="text-xs font-medium px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {lang === "ru" ? "Indigenous people" : "Indigenous People"}
                </span>
              )}
              {nation.population && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {nation.population}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white">{name}</h2>
            {nation.nativeName && nation.nativeName !== name && (
              <div className="text-base text-zinc-400 mt-1">
                {nation.nativeName}
              </div>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Languages */}
        <div className="flex items-center gap-2 mt-4">
          <Languages className="w-4 h-4 text-zinc-500" />
          <div className="flex flex-wrap gap-1.5">
            {nation.languages.map((language) => (
              <span
                key={language}
                className="text-xs px-2 py-1 rounded-md bg-zinc-800/50 text-zinc-300"
              >
                {language}
              </span>
            ))}
          </div>
        </div>

        {/* Regions */}
        {regionNames.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <MapPin className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">
              {regionNames.join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-5 max-h-[400px] overflow-y-auto">
        {/* History */}
        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {lang === "ru" ? "History" : "History"}
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">{history}</p>
        </div>

        {/* Culture */}
        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {lang === "ru" ? "Культура" : "Culture"}
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">{culture}</p>
        </div>

        {/* Traditions */}
        {traditions && traditions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-300 mb-2">
              {lang === "ru" ? "Традиции" : "Traditions"}
            </h3>
            <div className="flex flex-wrap gap-2">
              {traditions.map((tradition, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1.5 rounded-full bg-zinc-800/50 text-zinc-300 border border-zinc-700/50"
                >
                  {tradition}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Select button */}
        {onSelect && (
          <button
            onClick={onSelect}
            className={`w-full rounded-lg py-3 text-sm font-medium transition ${
              isSelected
                ? "bg-gold-border text-black"
                : "border border-gold-border bg-gold-dim text-gold-text hover:bg-gold-border/30"
            }`}
          >
            {isSelected
              ? lang === "ru"
                ? "Выбрано"
                : "Selected"
              : lang === "ru"
              ? "Select people"
              : "Select Nation"}
          </button>
        )}
      </div>
    </div>
  );
}

export default NationCard;
