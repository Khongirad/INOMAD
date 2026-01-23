"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Map, Users, Globe, ChevronRight } from "lucide-react";

import {
  DOCTRINAL_REGIONS,
  NATIONS,
  type DoctrinalRegion,
  type SubRegion,
  type Nation,
  getNationByCode,
} from "../identity/create/_core/geography";

import { RegionCard } from "@/components/geo/RegionCard";
import { NationCard } from "@/components/geo/NationCard";

// Динамический импорт карты
const GeoMap = dynamic(() => import("@/components/geo/GeoMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-zinc-900/50 rounded-xl flex items-center justify-center">
      <div className="text-zinc-500">Загрузка карты...</div>
    </div>
  ),
});

// ─────────────────────────────────────────────────────────────────────────────
// СТРАНИЦА ТЕРРИТОРИЙ
// ─────────────────────────────────────────────────────────────────────────────

export default function TerritoryPage() {
  const [selectedRegion, setSelectedRegion] = useState<DoctrinalRegion | null>(
    null
  );
  const [selectedSubRegion, setSelectedSubRegion] = useState<SubRegion | null>(
    null
  );
  const [selectedNation, setSelectedNation] = useState<Nation | null>(null);
  const [view, setView] = useState<"map" | "regions" | "nations">("map");
  const [showSubRegions, setShowSubRegions] = useState(false);

  const handleRegionClick = useCallback((region: DoctrinalRegion) => {
    setSelectedRegion(region);
    setSelectedSubRegion(null);
    setSelectedNation(null);
    if (region.id === "siberia") {
      setShowSubRegions(true);
    }
  }, []);

  const handleSubRegionClick = useCallback(
    (subRegion: SubRegion, parentRegion: DoctrinalRegion) => {
      setSelectedRegion(parentRegion);
      setSelectedSubRegion(subRegion);
    },
    []
  );

  const handleNationSelect = useCallback((nationCode: string) => {
    const nation = getNationByCode(nationCode);
    if (nation) {
      setSelectedNation(nation);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRegion(null);
    setSelectedSubRegion(null);
    setSelectedNation(null);
    setShowSubRegions(false);
  }, []);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-8">
        <div className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
          Геопространство
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">
          Территории и народы
        </h1>
        <p className="mt-4 text-lg text-zinc-300 max-w-2xl leading-relaxed">
          Интерактивная карта регионов ответственности. Каждый регион имеет
          своих коренных хранителей земли.
        </p>

        {/* View toggle */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setView("map")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === "map"
                ? "bg-gold-dim text-gold-text border border-gold-border"
                : "bg-zinc-800/50 text-zinc-400 hover:text-white"
            }`}
          >
            <Map className="w-4 h-4" />
            Карта
          </button>
          <button
            onClick={() => setView("regions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === "regions"
                ? "bg-gold-dim text-gold-text border border-gold-border"
                : "bg-zinc-800/50 text-zinc-400 hover:text-white"
            }`}
          >
            <Globe className="w-4 h-4" />
            Регионы
          </button>
          <button
            onClick={() => setView("nations")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === "nations"
                ? "bg-gold-dim text-gold-text border border-gold-border"
                : "bg-zinc-800/50 text-zinc-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            Народы
          </button>
        </div>
      </div>

      {/* Map View */}
      {view === "map" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <GeoMap
              height="600px"
              showRegionLayers
              showSubRegions={showSubRegions}
              selectionMode="region"
              selectedRegionId={selectedRegion?.id}
              selectedSubRegionId={selectedSubRegion?.id}
              onRegionClick={handleRegionClick}
              onSubRegionClick={handleSubRegionClick}
              className="rounded-2xl overflow-hidden"
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Selected region/nation card */}
            {selectedNation ? (
              <NationCard
                nation={selectedNation}
                lang="ru"
                onClose={() => setSelectedNation(null)}
              />
            ) : selectedRegion ? (
              <RegionCard
                region={selectedRegion}
                subRegion={selectedSubRegion || undefined}
                lang="ru"
                onClose={clearSelection}
                onNationSelect={handleNationSelect}
              />
            ) : (
              <div className="glass-panel rounded-xl p-6 text-center">
                <Globe className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
                <div className="text-zinc-400">
                  Выберите регион на карте, чтобы увидеть информацию
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="glass-panel rounded-xl p-5">
              <div className="text-sm font-medium text-zinc-300 mb-4">
                Статистика
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">
                    {DOCTRINAL_REGIONS.length}
                  </div>
                  <div className="text-xs text-zinc-500">Регионов</div>
                </div>
                <div className="glass-card rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">
                    {NATIONS.length}
                  </div>
                  <div className="text-xs text-zinc-500">Народов</div>
                </div>
                <div className="glass-card rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">
                    {NATIONS.filter((n) => n.isIndigenous).length}
                  </div>
                  <div className="text-xs text-zinc-500">Коренных</div>
                </div>
                <div className="glass-card rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">
                    {
                      DOCTRINAL_REGIONS.find((r) => r.id === "siberia")
                        ?.subRegions?.length
                    }
                  </div>
                  <div className="text-xs text-zinc-500">Зон Сибири</div>
                </div>
              </div>
            </div>

            {/* Siberia subregions toggle */}
            {selectedRegion?.id === "siberia" && (
              <button
                onClick={() => setShowSubRegions(!showSubRegions)}
                className="w-full glass-panel rounded-xl p-4 flex items-center justify-between hover:bg-zinc-800/30 transition"
              >
                <span className="text-sm text-zinc-300">
                  {showSubRegions
                    ? "Скрыть зоны Сибири"
                    : "Показать зоны Сибири"}
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-zinc-500 transition-transform ${
                    showSubRegions ? "rotate-90" : ""
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Regions List View */}
      {view === "regions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOCTRINAL_REGIONS.map((region) => (
            <button
              key={region.id}
              onClick={() => {
                setSelectedRegion(region);
                setView("map");
              }}
              className="glass-panel rounded-xl p-5 text-left hover:bg-zinc-800/30 transition group"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-4 h-4 rounded-full mt-1"
                  style={{ backgroundColor: region.color }}
                />
                <div>
                  <div className="text-base font-semibold text-white group-hover:text-gold-text transition">
                    {region.nameRu}
                  </div>
                  <div className="text-sm text-zinc-500 mt-1">
                    {region.name}
                  </div>
                  <div className="text-xs text-zinc-600 mt-2">
                    {region.indigenousPeoples.length > 0
                      ? `${region.indigenousPeoples.length} коренных народов`
                      : "Нет данных о коренных народах"}
                  </div>
                  {region.subRegions && (
                    <div className="text-xs text-zinc-500 mt-1">
                      {region.subRegions.length} внутренних зон
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Nations List View */}
      {view === "nations" && (
        <div className="space-y-6">
          {/* Indigenous nations */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Коренные народы
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {NATIONS.filter((n) => n.isIndigenous).map((nation) => (
                <NationCard
                  key={nation.code}
                  nation={nation}
                  lang="ru"
                  compact
                  isSelected={selectedNation?.code === nation.code}
                  onSelect={() => setSelectedNation(nation)}
                />
              ))}
            </div>
          </div>

          {/* Other nations */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Другие народы
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {NATIONS.filter((n) => !n.isIndigenous).map((nation) => (
                <NationCard
                  key={nation.code}
                  nation={nation}
                  lang="ru"
                  compact
                  isSelected={selectedNation?.code === nation.code}
                  onSelect={() => setSelectedNation(nation)}
                />
              ))}
            </div>
          </div>

          {/* Selected nation detail */}
          {selectedNation && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="animate-in zoom-in-95">
                <NationCard
                  nation={selectedNation}
                  lang="ru"
                  onClose={() => setSelectedNation(null)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Key phrase */}
      <div className="glass-panel rounded-xl p-6 text-center border border-gold-border/10 bg-gradient-to-br from-gold-dim/5 to-transparent">
        <p className="text-lg text-zinc-300 italic leading-relaxed max-w-2xl mx-auto">
          «Коренной народ несёт ответственность за землю и за всех проживающих
          на ней.»
        </p>
      </div>
    </div>
  );
}
