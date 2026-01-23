"use client";

import { useState, useCallback, useReducer, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Globe,
  User,
  MapPin,
  ShieldCheck,
  Users,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  BookOpen,
  Scroll,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NATIONS,
  type DoctrinalRegion,
  type GeoCoordinates,
  type Nation,
  determineResidenceStatus,
  getIndigenousNationsForRegion,
} from "@/app/(app)/identity/create/_core/geography";
import { createEmptyDraft } from "@/app/(app)/identity/create/_core/types";
import type { MacroRegion } from "@/app/(app)/identity/create/_core/types";
import { identityReducer } from "@/app/(app)/identity/create/_core/reducer";
import { saveDraft, loadDraft } from "@/app/(app)/identity/create/_core/storage";
import { GatewayPortal } from "@/components/geo/GatewayPortal";
import { NationCard } from "@/components/geo/NationCard";
import { ResidenceStatusCard } from "@/components/geo/ResidenceStatusCard";

const GeoMap = dynamic(() => import("@/components/geo/GeoMap"), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-zinc-950 rounded-xl flex items-center justify-center">
      <div className="text-zinc-600 text-xs">Loading map...</div>
    </div>
  ),
});

const STEPS = [
  { id: "land", title: "The Call of the Land", description: "Declare your territorial origin", icon: MapPin },
  { id: "region", title: "Land & Peoples", description: "History of the chosen land", icon: BookOpen },
  { id: "identity", title: "Blood & Identity", description: "Select your ethnicity and clan", icon: User },
  { id: "proof", title: "Social Proof", description: "Extracting data for verification", icon: ShieldCheck },
  { id: "initiation", title: "The Initiation", description: "Enter the sovereign order", icon: Globe },
];

export default function RegistrationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [gatewayEntered, setGatewayEntered] = useState(false);

  // Identity state (connected to reducer/storage)
  const [draft, dispatch] = useReducer(identityReducer, undefined, createEmptyDraft);
  const hydrated = useRef(false);

  useEffect(() => {
    const saved = loadDraft();
    if (saved) dispatch({ type: "HYDRATE", draft: saved });
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const t = setTimeout(() => saveDraft(draft), 300);
    return () => clearTimeout(t);
  }, [draft]);

  // Geo state
  const [selectedRegion, setSelectedRegion] = useState<DoctrinalRegion | null>(null);
  const [selectedNation, setSelectedNation] = useState<Nation | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<GeoCoordinates | null>(null);

  const handleRegionClick = useCallback((region: DoctrinalRegion) => {
    setSelectedRegion(region);
    dispatch({ type: "SET_TERRITORY_MACROREGION", value: region.code as MacroRegion });
    dispatch({
      type: "SET_BIRTHPLACE_GEO",
      value: {
        label: draft.basic.placeOfBirth.label || region.nameRu,
        regionId: region.id,
        subRegionId: undefined,
        coordinates: undefined,
      },
    });
  }, [draft.basic.placeOfBirth.label]);

  const handleLocationSelect = useCallback((coords: GeoCoordinates, name?: string) => {
    setSelectedCoords(coords);
    if (name) {
      dispatch({
        type: "SET_BIRTHPLACE_GEO",
        value: {
          label: name,
          regionId: selectedRegion?.id,
          coordinates: coords,
        },
      });
    }
  }, [selectedRegion]);

  const handleNationSelect = useCallback((nation: Nation) => {
    setSelectedNation(nation);
    const status = selectedRegion
      ? determineResidenceStatus(nation.code, selectedRegion.id)
      : undefined;
    dispatch({
      type: "SET_NATIONALITY",
      value: {
        code: nation.code,
        label: nation.nameRu,
        nativeName: nation.nativeName,
        isIndigenous: nation.isIndigenous,
        residenceStatus: status,
      },
    });
  }, [selectedRegion]);

  const residenceStatus = selectedNation && selectedRegion
    ? determineResidenceStatus(selectedNation.code, selectedRegion.id)
    : null;

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Persist the draft
      saveDraft(draft);
      // Navigate to identity creation for full form completion
      router.push("/identity/create");
    } catch (error) {
      console.error("Registration failed", error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show the registration form until gateway is entered
  if (!gatewayEntered) {
    return (
      <GatewayPortal
        isOpen
        onEnter={() => {
          // Delay so the portal animation plays before unmounting
          setTimeout(() => setGatewayEntered(true), 900);
        }}
        title="Врата Хурала"
        subtitle="Вход в пространство регистрации гражданства"
        lang="ru"
      >
        <div />
      </GatewayPortal>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ritual Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif tracking-widest text-gold-primary mb-2 uppercase">
            State Entry Ritual
          </h1>
          <p className="text-zinc-500 font-mono text-sm">INOMAD KHURAL CENSUS PROTOCOL</p>
        </div>

        {/* Stepper Progress */}
        <div className="flex justify-between mb-12">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center flex-1 relative">
              <div
                className={cn(
                  "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-700",
                  currentStep >= idx
                    ? "border-gold-primary bg-gold-primary/10 text-gold-primary shadow-lg"
                    : "border-zinc-800 text-zinc-600"
                )}
              >
                <step.icon size={20} />
              </div>
              <div className="mt-2 text-center">
                <p className={cn("text-[10px] uppercase tracking-tighter", currentStep >= idx ? "text-gold-secondary" : "text-zinc-600")}>
                  Step {idx + 1}
                </p>
                <p className={cn("text-xs font-medium", currentStep >= idx ? "text-zinc-200" : "text-zinc-500")}>
                  {step.title}
                </p>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn("absolute top-6 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-[1px] bg-zinc-800", currentStep > idx && "bg-gold-primary/30")} />
              )}
            </div>
          ))}
        </div>

        <Card className="p-8 bg-zinc-900/50 border-zinc-800 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Step 0: Select Your Land */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2 className="text-2xl font-serif text-zinc-100 flex items-center gap-3">
                <MapPin className="text-gold-primary" /> Select Your Land
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Every citizen is bound to territory. Select your birthplace region on the map or enter manually.
              </p>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Region / State</Label>
                  <Input
                    placeholder="e.g. Baikal, Altai"
                    value={selectedRegion?.nameRu || ""}
                    readOnly
                    className="bg-zinc-950/50 border-zinc-800 text-zinc-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Birthplace (as in passport)</Label>
                  <Input
                    placeholder="e.g. г. Улан-Удэ, Бурятия"
                    value={draft.basic.placeOfBirth.label}
                    onChange={(e) => dispatch({ type: "SET_BIRTHPLACE_LABEL", value: e.target.value })}
                  />
                </div>
              </div>

              {/* Interactive Map */}
              <GeoMap
                height="250px"
                showRegionLayers
                selectionMode="point"
                selectedRegionId={selectedRegion?.id}
                onRegionClick={handleRegionClick}
                onLocationSelect={handleLocationSelect}
                initialZoom={3}
                className="rounded-xl overflow-hidden"
              />
              {selectedCoords && (
                <div className="text-[10px] font-mono text-gold-secondary/60 text-right mt-1">
                  {selectedCoords.lat.toFixed(3)}, {selectedCoords.lng.toFixed(3)}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Land & Peoples (Region + Indigenous History) */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
              <h2 className="text-2xl font-serif text-zinc-100 flex items-center gap-3">
                <BookOpen className="text-gold-primary" /> {selectedRegion?.nameRu || "Выбранная земля"}
              </h2>

              {selectedRegion ? (
                <>
                  {/* Region overview */}
                  <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/50 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedRegion.color }} />
                      <span className="text-lg font-semibold text-zinc-100">{selectedRegion.nameRu}</span>
                      <span className="text-xs text-zinc-500 font-mono uppercase">{selectedRegion.name}</span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">{selectedRegion.descriptionRu}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedRegion.languages.slice(0, 5).map(lang => (
                        <span key={lang} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                          {lang}
                        </span>
                      ))}
                      {selectedRegion.languages.length > 5 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
                          +{selectedRegion.languages.length - 5}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cultural notes */}
                  <div className="p-4 rounded-lg border border-gold-border/20 bg-gold-surface/5 text-sm text-zinc-300 italic leading-relaxed">
                    <Scroll size={14} className="inline text-gold-secondary mr-2" />
                    {selectedRegion.culturalNotesRu}
                  </div>

                  {/* Responsibility principle */}
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-center">
                    <p className="text-xs text-gold-secondary/80 italic">
                      {"\u00AB"}{selectedRegion.responsibilityPrincipleRu}{"\u00BB"}
                    </p>
                  </div>

                  {/* Indigenous peoples of this region */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                      <Users size={14} className="text-gold-primary" />
                      Коренные народы этой земли
                    </h3>
                    <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                      {getIndigenousNationsForRegion(selectedRegion.id).map(nation => (
                        <div key={nation.code} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/30 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-100">{nation.nameRu}</span>
                            {nation.nativeName && nation.nativeName !== nation.nameRu && (
                              <span className="text-xs text-zinc-500">({nation.nativeName})</span>
                            )}
                            {nation.population && (
                              <span className="ml-auto text-[10px] text-zinc-600 font-mono">{nation.population}</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">{nation.historyRu}</p>
                          <p className="text-xs text-zinc-500 leading-relaxed">{nation.cultureRu}</p>
                          {nation.traditionsRu && nation.traditionsRu.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {nation.traditionsRu.map(t => (
                                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gold-surface/10 border border-gold-border/20 text-gold-secondary/80">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-950/30 text-center space-y-3">
                  <MapPin size={32} className="mx-auto text-zinc-600" />
                  <p className="text-zinc-500 text-sm">Вернитесь назад и выберите регион на карте</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Blood & Identity */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
              <h2 className="text-2xl font-serif text-zinc-100 flex items-center gap-3">
                <Users className="text-gold-primary" /> Identity & Bloodline
              </h2>
              <p className="text-zinc-500 text-sm">
                Ethnicity is independent of territory. Your cultural identity is preserved, but state responsibility is territorial.
              </p>

              <div className="space-y-4">
                <Label>Select Primary Nation</Label>
                <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1">
                  {NATIONS.filter(n => n.isIndigenous).map(nation => (
                    <button
                      key={nation.code}
                      onClick={() => handleNationSelect(nation)}
                      className={cn(
                        "p-3 rounded-xl border-2 text-left transition-all duration-300",
                        selectedNation?.code === nation.code
                          ? "border-gold-primary bg-gold-primary/10 text-gold-primary shadow-inner"
                          : "border-zinc-800 bg-zinc-950/30 text-zinc-500 hover:border-zinc-700"
                      )}
                    >
                      <span className="text-sm font-medium">{nation.nameRu}</span>
                      {nation.nativeName && nation.nativeName !== nation.nameRu && (
                        <span className="block text-xs text-zinc-600 mt-0.5">{nation.nativeName}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected nation detail */}
              {selectedNation && (
                <NationCard nation={selectedNation} lang="ru" compact isSelected />
              )}

              {/* Residence status */}
              {residenceStatus && selectedRegion && selectedNation && (
                <ResidenceStatusCard
                  status={residenceStatus}
                  regionName={selectedRegion.nameRu}
                  nationName={selectedNation.nameRu}
                  lang="ru"
                />
              )}
            </div>
          )}

          {/* Step 3: Social Proof */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
              <h2 className="text-2xl font-serif text-zinc-100 flex items-center gap-3">
                <ShieldCheck className="text-gold-primary" /> Extraction of Sovereignty
              </h2>
              <p className="text-zinc-500 text-sm">
                Upload your document to verify your birthplace. This creates a chain of responsibility starting from your origin.
              </p>

              <div className="h-64 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950/50 flex flex-col items-center justify-center space-y-4 hover:border-gold-primary/30 transition-all group cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform text-zinc-400 group-hover:text-gold-primary">
                  <Globe size={32} />
                </div>
                <div className="text-center">
                  <p className="text-zinc-300 font-medium">Click to upload Passport / Birth Certificate</p>
                  <p className="text-zinc-600 text-xs">PDF, PNG, JPG accepted. 10MB limit.</p>
                </div>
              </div>

              <div className="p-4 bg-gold-surface/5 border border-gold-border text-gold-secondary rounded-lg flex gap-3 text-xs leading-relaxed italic">
                <ShieldCheck className="shrink-0" />
                <span>By uploading, you acknowledge that your verification is a political act. Providing false data will lead to Seat forfeiture.</span>
              </div>
            </div>
          )}

          {/* Step 4: The Final Seal */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-serif text-gold-primary">The Final Seal</h2>
                <div className="p-1 px-4 border border-gold-border bg-gold-surface/10 rounded-full inline-block text-[10px] tracking-widest uppercase text-gold-secondary animate-pulse">
                  Territory: {draft.basic.placeOfBirth.label || selectedRegion?.nameRu || "UNSPECIFIED"}
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 border-y border-zinc-800 py-8">
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase font-mono">Region</p>
                  <p className="text-lg text-zinc-100 font-serif">{selectedRegion?.nameRu || "N/A"}</p>
                </div>
                <div className="text-center border-x border-zinc-800">
                  <p className="text-zinc-600 text-[10px] uppercase font-mono">Nation</p>
                  <p className="text-lg text-zinc-100 font-serif">{selectedNation?.nameRu || "N/A"}</p>
                </div>
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase font-mono">Status</p>
                  <p className="text-lg text-zinc-100 font-serif">
                    {residenceStatus === "home" ? "HOME" : residenceStatus === "resident" ? "RESIDENT" : residenceStatus === "guest" ? "GUEST" : "PENDING"}
                  </p>
                </div>
              </div>

              <p className="text-center text-zinc-500 text-sm max-w-lg mx-auto italic">
                {"\u00AB"}To enter the Khural is to accept responsibility for your land and your people.{"\u00BB"}
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="mt-12 flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 0 || loading}
              className="gap-2"
            >
              <ChevronLeft size={16} /> Back
            </Button>

            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
              Ritual Part {currentStep + 1} of {STEPS.length}
            </div>

            {currentStep < STEPS.length - 1 ? (
              <Button onClick={nextStep} className="gap-2 group">
                Continue <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                loading={loading}
                className="gap-2 min-w-[160px]"
              >
                Initiate Sovereign <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
