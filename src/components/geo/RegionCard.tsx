"use client";

import { useState } from "react";
import { X, MapPin, Users, Languages, BookOpen, Heart, Anchor } from "lucide-react";

import type {
  DoctrinalRegion,
  SubRegion,
  TerritoryStatus,
} from "@/app/(app)/identity/create/_core/geography";
import {
  getNationsForRegion,
  getIndigenousNationsForRegion,
} from "@/app/(app)/identity/create/_core/geography";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface RegionCardProps {
  region: DoctrinalRegion;
  subRegion?: SubRegion;
  onClose?: () => void;
  onNationSelect?: (nationCode: string) => void;
  className?: string;
  lang?: "en" | "ru";
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function getStatusLabel(status: TerritoryStatus, lang: "en" | "ru"): string {
  const labels: Record<TerritoryStatus, { en: string; ru: string }> = {
    core: { en: "Core Territory", ru: "Core" },
    state: { en: "State Region", ru: "State zone" },
    indigenous: { en: "Indigenous Region", ru: "Indigenous Region" },
    city_state: { en: "City-State", ru: "City-state" },
    special: { en: "Special Status", ru: "Special Status" },
  };
  return labels[status][lang];
}

function getStatusColor(status: TerritoryStatus): string {
  const colors: Record<TerritoryStatus, string> = {
    core: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    state: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    indigenous: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    city_state: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    special: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  };
  return colors[status];
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function RegionCard({
  region,
  subRegion,
  onClose,
  onNationSelect,
  className = "",
  lang = "ru",
}: RegionCardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "peoples" | "culture">(
    "overview"
  );

  const indigenousNations = getIndigenousNationsForRegion(region.id);
  const allNations = getNationsForRegion(region.id);

  const displayName = subRegion
    ? lang === "ru"
      ? subRegion.nameRu
      : subRegion.name
    : lang === "ru"
    ? region.nameRu
    : region.name;

  const description = lang === "ru" ? region.descriptionRu : region.description;
  const culturalNotes =
    lang === "ru" ? region.culturalNotesRu : region.culturalNotes;
  const responsibility =
    lang === "ru"
      ? region.responsibilityPrincipleRu
      : region.responsibilityPrinciple;

  return (
    <div
      className={`glass-panel rounded-2xl overflow-hidden ${className}`}
      style={{ maxWidth: "480px" }}
    >
      {/* Header */}
      <div
        className="p-5 border-b border-zinc-800/50"
        style={{
          background: `linear-gradient(135deg, ${region.color}15 0%, transparent 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-md border ${getStatusColor(
                  region.status
                )}`}
              >
                {getStatusLabel(region.status, lang)}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white">{displayName}</h2>
            {subRegion && (
              <div className="text-sm text-zinc-400 mt-1">
                {lang === "ru" ? region.nameRu : region.name}
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

        {/* Subregion capital */}
        {subRegion?.capitalRu && (
          <div className="flex items-center gap-2 mt-3 text-sm text-zinc-300">
            <MapPin className="w-4 h-4" />
            <span>
              {lang === "ru" ? "Capital" : "Capital"}:{" "}
              {lang === "ru" ? subRegion.capitalRu : subRegion.capital}
            </span>
          </div>
        )}

        {/* Sea gates */}
        {subRegion?.seaGates && subRegion.seaGates.length > 0 && (
          <div className="flex items-center gap-2 mt-2 text-sm text-cyan-300">
            <Anchor className="w-4 h-4" />
            <span>
              {subRegion.seaGates
                .map((g) => (lang === "ru" ? g.nameRu : g.name))
                .join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800/50">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition ${
            activeTab === "overview"
              ? "text-gold-text border-b-2 border-gold-border"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {lang === "ru" ? "Overview" : "Overview"}
        </button>
        <button
          onClick={() => setActiveTab("peoples")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition ${
            activeTab === "peoples"
              ? "text-gold-text border-b-2 border-gold-border"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {lang === "ru" ? "Peoples" : "Peoples"}
        </button>
        <button
          onClick={() => setActiveTab("culture")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition ${
            activeTab === "culture"
              ? "text-gold-text border-b-2 border-gold-border"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {lang === "ru" ? "Culture" : "Culture"}
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
        {activeTab === "overview" && (
          <>
            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {lang === "ru" ? "About" : "About"}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {subRegion
                  ? lang === "ru"
                    ? subRegion.descriptionRu
                    : subRegion.description
                  : description}
              </p>
            </div>

            {/* Languages */}
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                <Languages className="w-4 h-4" />
                {lang === "ru" ? "Languages" : "Languages"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {region.languages.slice(0, 6).map((language) => (
                  <span
                    key={language}
                    className="text-xs px-2 py-1 rounded-md bg-zinc-800/50 text-zinc-300"
                  >
                    {language}
                  </span>
                ))}
                {region.languages.length > 6 && (
                  <span className="text-xs px-2 py-1 text-zinc-500">
                    +{region.languages.length - 6}
                  </span>
                )}
              </div>
            </div>

            {/* Responsibility principle */}
            <div className="glass-card rounded-lg p-4 border border-gold-border/20 bg-gold-dim/5">
              <h3 className="text-sm font-medium text-gold-text mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                {lang === "ru" ? "Responsibility Principle" : "Responsibility"}
              </h3>
              <p className="text-sm text-zinc-300 italic leading-relaxed">
                «{responsibility}»
              </p>
            </div>
          </>
        )}

        {activeTab === "peoples" && (
          <>
            {/* Indigenous peoples */}
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {lang === "ru" ? "Indigenous Peoples" : "Indigenous Peoples"}
              </h3>
              {indigenousNations.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {indigenousNations.map((nation) => (
                    <button
                      key={nation.code}
                      onClick={() => onNationSelect?.(nation.code)}
                      className="glass-card rounded-lg p-3 text-left hover:bg-zinc-800/50 transition group"
                    >
                      <div className="text-sm font-medium text-zinc-200 group-hover:text-gold-text transition">
                        {lang === "ru" ? nation.nameRu : nation.name}
                      </div>
                      {nation.nativeName && nation.nativeName !== nation.nameRu && (
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {nation.nativeName}
                        </div>
                      )}
                      {nation.population && (
                        <div className="text-xs text-zinc-500 mt-1">
                          {nation.population}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  {lang === "ru"
                    ? "No data on indigenous peoples"
                    : "No indigenous peoples data"}
                </p>
              )}
            </div>

            {/* All peoples in region */}
            {allNations.length > indigenousNations.length && (
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">
                  {lang === "ru" ? "Other Peoples" : "Other Peoples"}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allNations
                    .filter((n) => !n.isIndigenous)
                    .map((nation) => (
                      <button
                        key={nation.code}
                        onClick={() => onNationSelect?.(nation.code)}
                        className="text-xs px-2 py-1 rounded-md bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition"
                      >
                        {lang === "ru" ? nation.nameRu : nation.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "culture" && (
          <>
            {/* Cultural notes */}
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-2">
                {lang === "ru" ? "Cultural Notes" : "Cultural Notes"}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {culturalNotes}
              </p>
            </div>

            {/* Traditions from nations */}
            {indigenousNations.some(
              (n) => n.traditions && n.traditions.length > 0
            ) && (
              <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-2">
                  {lang === "ru" ? "Traditions of Peoples" : "Traditions"}
                </h3>
                <div className="space-y-3">
                  {indigenousNations
                    .filter((n) => n.traditions && n.traditions.length > 0)
                    .slice(0, 3)
                    .map((nation) => (
                      <div key={nation.code}>
                        <div className="text-xs text-zinc-500 mb-1">
                          {lang === "ru" ? nation.nameRu : nation.name}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(lang === "ru"
                            ? nation.traditionsRu
                            : nation.traditions
                          )
                            ?.slice(0, 3)
                            .map((tradition, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 rounded-full bg-zinc-800/50 text-zinc-300"
                              >
                                {tradition}
                              </span>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default RegionCard;
