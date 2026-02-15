"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { MapPin, ChevronRight, Search, X } from "lucide-react";

import {
  DOCTRINAL_REGIONS,
  NATIONS,
  type DoctrinalRegion,
  type SubRegion,
  type GeoCoordinates,
  type Nation,
  determineResidenceStatus,
} from "@/app/(app)/identity/create/_core/geography";

import { RegionCard } from "./RegionCard";
import { NationCard } from "./NationCard";
import { ResidenceStatusCard } from "./ResidenceStatusCard";

// Dynamic map import (for SSR)
const GeoMap = dynamic(() => import("./GeoMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-zinc-900/50 rounded-xl flex items-center justify-center">
      <div className="text-zinc-500">Loading map...</div>
    </div>
  ),
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface BirthplaceSelectorProps {
  onComplete?: (data: BirthplaceData) => void;
  initialData?: Partial<BirthplaceData>;
  className?: string;
  lang?: "en" | "ru";
}

export interface BirthplaceData {
  region: DoctrinalRegion;
  subRegion?: SubRegion;
  coordinates?: GeoCoordinates;
  placeName: string;
  nation: Nation;
}

type Step = "Region" | "location" | "nation" | "status" | "complete";

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function BirthplaceSelector({
  onComplete,
  initialData,
  className = "",
  lang = "ru",
}: BirthplaceSelectorProps) {
  const [step, setStep] = useState<Step>("Region");
  const [selectedRegion, setSelectedRegion] = useState<DoctrinalRegion | null>(
    initialData?.region || null
  );
  const [selectedSubRegion, setSelectedSubRegion] = useState<SubRegion | null>(
    initialData?.subRegion || null
  );
  const [selectedCoords, setSelectedCoords] = useState<GeoCoordinates | null>(
    initialData?.coordinates || null
  );
  const [placeName, setPlaceName] = useState(initialData?.placeName || "");
  const [selectedNation, setSelectedNation] = useState<Nation | null>(
    initialData?.nation || null
  );
  const [nationSearch, setNationSearch] = useState("");
  const [showRegionCard, setShowRegionCard] = useState(false);
  const [showNationCard, setShowNationCard] = useState(false);

  // Filter nations by search
  const filteredNations = useMemo(() => {
    if (!nationSearch.trim()) return NATIONS;
    const search = nationSearch.toLowerCase();
    return NATIONS.filter(
      (n) =>
        n.name.toLowerCase().includes(search) ||
        n.nameRu.toLowerCase().includes(search) ||
        n.nativeName?.toLowerCase().includes(search)
    );
  }, [nationSearch]);

  // Determine residence status
  const residenceStatus = useMemo(() => {
    if (!selectedNation || !selectedRegion) return null;
    return determineResidenceStatus(selectedNation.code, selectedRegion.id);
  }, [selectedNation, selectedRegion]);

  // Handlers
  const handleRegionClick = useCallback((region: DoctrinalRegion) => {
    setSelectedRegion(region);
    setShowRegionCard(true);
  }, []);

  const handleSubRegionClick = useCallback(
    (subRegion: SubRegion, parentRegion: DoctrinalRegion) => {
      setSelectedRegion(parentRegion);
      setSelectedSubRegion(subRegion);
      setShowRegionCard(true);
    },
    []
  );

  const handleLocationSelect = useCallback(
    (coords: GeoCoordinates, name?: string) => {
      setSelectedCoords(coords);
      if (name) setPlaceName(name);
    },
    []
  );

  const confirmRegion = useCallback(() => {
    setShowRegionCard(false);
    setStep("location");
  }, []);

  const confirmLocation = useCallback(() => {
    setStep("nation");
  }, []);

  const handleNationSelect = useCallback((nation: Nation) => {
    setSelectedNation(nation);
    setShowNationCard(true);
  }, []);

  const confirmNation = useCallback(() => {
    setShowNationCard(false);
    setStep("status");
  }, []);

  const confirmStatus = useCallback(() => {
    setStep("complete");
    if (selectedRegion && selectedNation && onComplete) {
      onComplete({
        region: selectedRegion,
        subRegion: selectedSubRegion || undefined,
        coordinates: selectedCoords || undefined,
        placeName,
        nation: selectedNation,
      });
    }
  }, [
    selectedRegion,
    selectedSubRegion,
    selectedCoords,
    placeName,
    selectedNation,
    onComplete,
  ]);

  const goBack = useCallback(() => {
    if (step === "location") setStep("Region");
    else if (step === "nation") setStep("location");
    else if (step === "status") setStep("nation");
  }, [step]);

  // Progress
  const progress = useMemo(() => {
    switch (step) {
      case "Region":
        return 25;
      case "location":
        return 50;
      case "nation":
        return 75;
      case "status":
      case "complete":
        return 100;
    }
  }, [step]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with progress */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
              {lang === "ru" ? "Registration" : "Registration"}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">
              {step === "Region" &&
                (lang === "ru" ? "Select region birth" : "Select Birth Region")}
              {step === "location" &&
                (lang === "ru"
                  ? "Specify place of birth"
                  : "Specify Birthplace")}
              {step === "nation" &&
                (lang === "ru"
                  ? "Specify Nationality"
                  : "Specify Nationality")}
              {step === "status" &&
                (lang === "ru" ? "Your Status" : "Your Status")}
              {step === "complete" &&
                (lang === "ru" ? "Done" : "Complete")}
            </h1>
          </div>
          {step !== "Region" && step !== "complete" && (
            <button
              onClick={goBack}
              className="text-sm text-zinc-400 hover:text-white transition flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              {lang === "ru" ? "Back" : "Back"}
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold-border to-gold-text transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* STEP 1: Region Selection */}
      {step === "Region" && (
        <div className="relative">
          <GeoMap
            height="450px"
            showRegionLayers
            showSubRegions={selectedRegion?.id === "siberia"}
            selectionMode="Region"
            selectedRegionId={selectedRegion?.id}
            selectedSubRegionId={selectedSubRegion?.id}
            onRegionClick={handleRegionClick}
            onSubRegionClick={handleSubRegionClick}
            className="rounded-2xl overflow-hidden"
          />

          {/* Region card overlay */}
          {showRegionCard && selectedRegion && (
            <div className="absolute top-4 right-4 z-10 animate-in slide-in-from-right-4">
              <RegionCard
                region={selectedRegion}
                subRegion={selectedSubRegion || undefined}
                lang={lang}
                onClose={() => setShowRegionCard(false)}
              />
              <button
                onClick={confirmRegion}
                className="mt-3 w-full rounded-lg bg-gold-border py-3 text-sm font-medium text-black hover:bg-gold-text transition"
              >
                {lang === "ru" ? "Confirm Region" : "Confirm Region"}
              </button>
            </div>
          )}

          {/* Region list for quick selection */}
          {!showRegionCard && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="glass-panel rounded-xl p-3">
                <div className="text-xs text-zinc-500 mb-2">
                  {lang === "ru" ? "Quick Select:" : "Quick select:"}
                </div>
                <div className="flex flex-wrap gap-2">
                  {DOCTRINAL_REGIONS.map((region) => (
                    <button
                      key={region.id}
                      onClick={() => handleRegionClick(region)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition ${
                        selectedRegion?.id === region.id
                          ? "bg-gold-dim text-gold-text border border-gold-border"
                          : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50"
                      }`}
                    >
                      {lang === "ru" ? region.nameRu : region.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Location Selection */}
      {step === "location" && selectedRegion && (
        <div className="space-y-4">
          <GeoMap
            height="350px"
            showRegionLayers
            showSubRegions={selectedRegion.id === "siberia"}
            selectionMode="point"
            selectedRegionId={selectedRegion.id}
            onLocationSelect={handleLocationSelect}
            initialCenter={selectedRegion.coordinates}
            initialZoom={selectedRegion.id === "siberia" ? 4 : 6}
            className="rounded-2xl overflow-hidden"
          />

          {/* Selected location info */}
          <div className="glass-panel rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold-dim/20">
                <MapPin className="w-5 h-5 text-gold-text" />
              </div>
              <div>
                <div className="text-sm text-zinc-400">
                  {lang === "ru" ? "Seat birth" : "Birthplace"}
                </div>
                <div className="text-base font-medium text-white">
                  {placeName || (lang === "ru" ? "Click on the map" : "Click on map")}
                </div>
              </div>
            </div>

            {/* Manual input */}
            <div>
              <label className="text-xs text-zinc-500 block mb-2">
                {lang === "ru"
                  ? "Or enter manually (as in passport):"
                  : "Or enter manually (as in passport):"}
              </label>
              <input
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder={
                  lang === "ru"
                    ? "Irkutsk, Irkutsk Oblast"
                    : "Irkutsk, Irkutsk Oblast"
                }
                className="input-field"
              />
            </div>

            {selectedCoords && (
              <div className="text-xs text-zinc-500">
                {lang === "ru" ? "Coordinates" : "Coordinates"}:{" "}
                {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
              </div>
            )}

            <button
              onClick={confirmLocation}
              disabled={!placeName.trim()}
              className="w-full rounded-lg bg-gold-border py-3 text-sm font-medium text-black hover:bg-gold-text transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {lang === "ru" ? "Continue" : "Continue"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Nation Selection */}
      {step === "nation" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="glass-panel rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={nationSearch}
                onChange={(e) => setNationSearch(e.target.value)}
                placeholder={
                  lang === "ru" ? "Search nation..." : "Search nation..."
                }
                className="input-field pl-10"
              />
              {nationSearch && (
                <button
                  onClick={() => setNationSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Nation grid */}
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
              {filteredNations.map((nation) => (
                <NationCard
                  key={nation.code}
                  nation={nation}
                  lang={lang}
                  compact
                  isSelected={selectedNation?.code === nation.code}
                  onSelect={() => handleNationSelect(nation)}
                />
              ))}
            </div>

            {/* Detailed nation card overlay */}
            {showNationCard && selectedNation && (
              <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-10">
                <div className="animate-in zoom-in-95">
                  <NationCard
                    nation={selectedNation}
                    lang={lang}
                    isSelected
                    onClose={() => setShowNationCard(false)}
                    onSelect={confirmNation}
                  />
                </div>
              </div>
            )}
          </div>

          {filteredNations.length === 0 && (
            <div className="glass-panel rounded-xl p-8 text-center">
              <div className="text-zinc-500">
                {lang === "ru" ? "Nation not found" : "Nation not found"}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: Status Display */}
      {step === "status" && selectedRegion && selectedNation && residenceStatus && (
        <div className="space-y-4">
          <ResidenceStatusCard
            status={residenceStatus}
            regionName={lang === "ru" ? selectedRegion.nameRu : selectedRegion.name}
            nationName={lang === "ru" ? selectedNation.nameRu : selectedNation.name}
            lang={lang}
          />

          {/* Key phrase */}
          <div className="glass-panel rounded-xl p-6 text-center border border-gold-border/20 bg-gradient-to-br from-gold-dim/10 to-transparent">
            <p className="text-lg text-zinc-200 italic leading-relaxed">
              {lang === "ru"
                ? "\"You are entering a shared space where everyone knows their home, respects others, and grows together.\""
                : "\"You enter a shared space where everyone knows their home, respects others, and grows together.\""}
            </p>
          </div>

          <button
            onClick={confirmStatus}
            className="w-full rounded-lg bg-gold-border py-4 text-base font-medium text-black hover:bg-gold-text transition shadow-[0_0_30px_-10px_var(--gold-glow)]"
          >
            {lang === "ru" ? "Confirm and Continue" : "Confirm and Continue"}
          </button>
        </div>
      )}

      {/* STEP 5: Complete */}
      {step === "complete" && selectedRegion && selectedNation && (
        <div className="glass-panel rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">
            {lang === "ru"
              ? "Geographic data saved"
              : "Geographic Data Saved"}
          </h2>
          <div className="text-sm text-zinc-400 space-y-1">
            <div>
              {lang === "ru" ? "Region" : "Region"}:{" "}
              <span className="text-zinc-200">
                {lang === "ru" ? selectedRegion.nameRu : selectedRegion.name}
              </span>
            </div>
            <div>
              {lang === "ru" ? "Seat birth" : "Birthplace"}:{" "}
              <span className="text-zinc-200">{placeName}</span>
            </div>
            <div>
              {lang === "ru" ? "People" : "Nation"}:{" "}
              <span className="text-zinc-200">
                {lang === "ru" ? selectedNation.nameRu : selectedNation.name}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BirthplaceSelector;
