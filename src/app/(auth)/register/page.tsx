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
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NATIONS,
  DOCTRINAL_REGIONS,
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

import { NationCard } from "@/components/geo/NationCard";
import { ResidenceStatusCard } from "@/components/geo/ResidenceStatusCard";
import { useMPCWallet } from "@/lib/hooks/use-mpc-wallet";
import { PinPad } from "@/components/wallet/PinPad";

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
  { id: "Region", title: "Land & Peoples", description: "History of the chosen land", icon: BookOpen },
  { id: "identity", title: "Blood & Identity", description: "Select your ethnicity and clan", icon: User },
  { id: "proof", title: "Social Proof", description: "Extracting data for verification", icon: ShieldCheck },
  { id: "wallet", title: "Financial Sovereignty", description: "Bank of Siberia Account", icon: Wallet },
  { id: "creating", title: "Creating Sovereign", description: "Initializing systems", icon: ShieldCheck },
  { id: "initiation", title: "The Initiation", description: "Enter the sovereign order", icon: Globe },
];

export default function RegistrationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Wallet setup
  const { createWallet, error: walletError } = useMPCWallet();
  const [walletPin, setWalletPin] = useState('');
  const [walletConfirmPin, setWalletConfirmPin] = useState('');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

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
        label: draft.basic.placeOfBirth.label || region.name,
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
        label: nation.name,
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
      // Step 5 will handle the actual wallet creation with visual feedback
      // Move to step 5 (Creating Sovereign) to show progress
      if (currentStep === 4) {
        // Validate PIN one more time
        if (walletPin.length !== 6) {
          setPinError('PIN must be 6 digits');
          setLoading(false);
          return;
        }
        if (walletPin !== walletConfirmPin) {
          setPinError('PINs do not match');
          setLoading(false);
          return;
        }
        
        // Progress to creation step
        setCurrentStep(5);
        
        // TEMPORARY: Skip actual wallet creation during registration
        // Will create wallet after authentication on dashboard
        // TODO: Remove this comment and implement proper backend flow
        // await createWallet(walletPin, 'SOCIAL');
        
        // Save draft with wallet PIN for later use
        // Store PIN temporarily in localStorage for wallet creation after auth
        if (typeof window !== 'undefined') {
          localStorage.setItem('pending_wallet_pin', walletPin);
        }
        saveDraft({...draft});
        
        // Small delay to show completion animation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Move to final initiation step
        setCurrentStep(6);
      } else if (currentStep === 6) {
        // Final completion - redirect to wallet setup
        // User must create wallet before accessing dashboard
        router.push("/wallet");
      }
    } catch (error) {
      console.error("Registration failed", error);
      setPinError(error instanceof Error ? error.message : 'Registration failed');
      // Return to wallet setup step on error
      setCurrentStep(4);
    } finally {
      setLoading(false);
    }
  };



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
                    value={selectedRegion?.name || ""}
                    readOnly
                    className="bg-zinc-950/50 border-zinc-800 text-zinc-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Birthplace (as in passport)</Label>
                  <Input
                    placeholder="e.g. Ulan-Ude, Buryatia"
                    value={draft.basic.placeOfBirth.label}
                    onChange={(e) => dispatch({ type: "SET_BIRTHPLACE_LABEL", value: e.target.value })}
                  />
                </div>
              </div>

              {/* List-Based Selection UI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
                  {/* Column 1: Responsibility Zones (Macro Regions) */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                      <div className="p-3 border-b border-zinc-800 bg-zinc-900 font-medium text-xs text-zinc-400 uppercase tracking-wider">
                          Responsibility Zone
                      </div>
                      <div className="overflow-y-auto flex-1 p-2 space-y-1">
                          {DOCTRINAL_REGIONS.map((region) => (
                              <button
                                  key={region.id}
                                  onClick={() => {
                                      handleRegionClick(region);
                                  }}
                                  className={cn(
                                      "w-full text-left px-3 py-3 rounded-lg text-sm transition-all flex items-center justify-between group",
                                      selectedRegion?.id === region.id || (selectedRegion?.id && region.subRegions?.some(sr => sr.id === selectedRegion.id))
                                      ? "bg-gold-primary/10 text-gold-primary border border-gold-primary/20"
                                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                  )}
                              >
                                  <span>{region.name}</span>
                                  {region.id === 'siberia' && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">CORE</span>}
                                  {region.id === 'caucasus' && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">INDIGENOUS</span>}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Column 2: Sub-Regions (Republics/Oblasts) */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                      <div className="p-3 border-b border-zinc-800 bg-zinc-900 font-medium text-xs text-zinc-400 uppercase tracking-wider">
                          Region / Republic
                      </div>
                      <div className="overflow-y-auto flex-1 p-2 space-y-1">
                          {!selectedRegion ? (
                              <div className="h-full flex items-center justify-center text-zinc-600 text-sm p-4 text-center">
                                  Select a Zone on the left
                              </div>
                          ) : (
                              <>
                                  {selectedRegion.subRegions ? (
                                      selectedRegion.subRegions.map(sub => (
                                          <button
                                              key={sub.id}
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  dispatch({ type: "SET_BIRTHPLACE_LABEL", value: `${sub.capital || ''}, ${sub.name}` });
                                              }}
                                              className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all flex flex-col gap-0.5 border border-transparent hover:border-zinc-700"
                                          >
                                              <span className="font-medium">{sub.name}</span>
                                              <span className="text-[10px] text-zinc-500">{sub.capital ? `Capital: ${sub.capital}` : 'Region'}</span>
                                          </button>
                                      ))
                                  ) : (
                                      <div className="p-4 text-zinc-500 text-sm text-center">
                                          This zone has no subdivisions listed.
                                          <br/>
                                          <span className="text-gold-primary">{selectedRegion.name}</span> selected.
                                      </div>
                                  )}
                              </>
                          )}
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-6 pt-4">
                <div className="space-y-2">
                  <Label>Birthplace (City/Settlement)</Label>
                  <Input
                    placeholder="e.g. Ulan-Ude"
                    value={draft.basic.placeOfBirth.label}
                    onChange={(e) => dispatch({ type: "SET_BIRTHPLACE_LABEL", value: e.target.value })}
                    className="bg-zinc-900 border-zinc-800"
                  />
                  <p className="text-[10px] text-zinc-500">
                      * Selecting a sub-region above will auto-suggest the capital.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Land & Peoples (Region + Indigenous History) */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
              <h2 className="text-2xl font-serif text-zinc-100 flex items-center gap-3">
                <BookOpen className="text-gold-primary" /> {selectedRegion?.name || "Selected Land"}
              </h2>

              {selectedRegion ? (
                <>
                  {/* Region overview */}
                  <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/50 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedRegion.color }} />
                      <span className="text-lg font-semibold text-zinc-100">{selectedRegion.name}</span>
                      <span className="text-xs text-zinc-500 font-mono uppercase">{selectedRegion.name}</span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">{selectedRegion.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedRegion.languages.slice(0, 5).map(lang => {
                        // Translate Russian language names to English
                        const langMap: Record<string, string> = {
                          'Russian': 'Russian', 'Buryat': 'Buryat', 'Tuvan': 'Tuvan',
                          'Yakut (Sakha)': 'Yakut (Sakha)', 'Altai': 'Altai', 'Khakas': 'Khakas',
                          'Chechen': 'Chechen', 'Avar': 'Avar', 'Dargin': 'Dargwa',
                          'Лезгинский': 'Lezgian', 'Ossetian': 'Ossetian', 'Ингушский': 'Ingush',
                          'Кабардинский': 'Kabardian', 'Adyghe': 'Adyghe', 'Карачаевский': 'Karachay',
                          'Balkar': 'Balkar', 'Кумыкский': 'Kumyk', 'Лакский': 'Lak', 'Табасаранский': 'Tabasaran'
                        };
                        return (
                          <span key={lang} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                            {langMap[lang] || lang}
                          </span>
                        );
                      })}
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
                    {selectedRegion.culturalNotes}
                  </div>

                  {/* Responsibility principle */}
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-center">
                    <p className="text-xs text-gold-secondary/80 italic">
                      {"\u00AB"}{selectedRegion.responsibilityPrinciple}{"\u00BB"}
                    </p>
                  </div>

                  {/* Indigenous peoples of this region */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                      <Users size={14} className="text-gold-primary" />
                      Indigenous Peoples of this Land
                    </h3>
                    <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                      {getIndigenousNationsForRegion(selectedRegion.id).map(nation => (
                        <div key={nation.code} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/30 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-100">{nation.name}</span>
                            {nation.nativeName && nation.nativeName !== nation.name && (
                              <span className="text-xs text-zinc-500">({nation.nativeName})</span>
                            )}
                            {nation.population && (
                              <span className="ml-auto text-[10px] text-zinc-600 font-mono">{nation.population}</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">{nation.history}</p>
                          <p className="text-xs text-zinc-500 leading-relaxed">{nation.culture}</p>
                          {nation.traditions && nation.traditions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {nation.traditions.map(t => (
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
                  <p className="text-zinc-500 text-sm">Go back and select a region on the map</p>
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
                      <span className="text-sm font-medium">{nation.name}</span>
                      {nation.nativeName && nation.nativeName !== nation.name && (
                        <span className="block text-xs text-zinc-600 mt-0.5">{nation.nativeName}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected nation detail */}
              {selectedNation && (
                <NationCard nation={selectedNation} lang="en" compact isSelected />
              )}

              {/* Residence status */}
              {residenceStatus && selectedRegion && selectedNation && (
                <ResidenceStatusCard
                  status={residenceStatus}
                  regionName={selectedRegion.name}
                  nationName={selectedNation.name}
                  lang="en"
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

          {/* Step 4: Financial Sovereignty - Bank of Siberia */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="text-center space-y-4">
                <Wallet className="mx-auto text-gold-primary w-16 h-16" />
                <h2 className="text-3xl font-serif text-gold-primary">Financial Sovereignty</h2>
                <p className="text-zinc-400 text-sm max-w-md mx-auto">
                  As a citizen, you receive a sovereign financial account managed by the <span className="text-gold-primary font-semibold">Bank of Siberia</span>. 
                  This account is cryptographically tied to your identity.
                </p>
              </div>

              {/* Bank of Siberia Branding Box */}
              <div className="p-6 bg-gradient-to-b from-blue-900/20 to-transparent border border-blue-500/30 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="text-blue-400" size={24} />
                  <h3 className="text-lg font-semibold text-blue-300">Bank of Siberia</h3>
                </div>
                <div className="space-y-2 text-sm text-zinc-300">
                  <p>• Multi-Party Computation (MPC) security</p>
                  <p>• No seed phrase required</p>
                  <p>• Social recovery through guardians</p>
                  <p>• Encrypted on your device</p>
                </div>
              </div>

              {/* PIN Setup */}
              <div className="space-y-4">
                <Label className="text-zinc-300 text-center block">
                  {walletPin.length < 6 ? 'Create Your 6-Digit PIN' : walletConfirmPin.length < 6 ? 'Confirm Your PIN' : 'PIN Confirmed'}
                </Label>
                <PinPad
                  value={walletPin.length < 6 ? walletPin : walletConfirmPin}
                  description={walletPin.length < 6 ? 'Set secure PIN for wallet access' : walletConfirmPin.length < 6 ? 'Re-enter your PIN to confirm' : 'PIN set successfully'}
                  onChange={(value) => {
                    if (walletPin.length < 6) {
                      setWalletPin(value);
                      if (value.length === 6) setPinError(null);
                    } else if (walletConfirmPin.length < 6) {
                      setWalletConfirmPin(value);
                      if (value.length === 6) {
                        if (value === walletPin) {
                          setPinError(null);
                        } else {
                          setPinError('PINs do not match');
                          setTimeout(() => setWalletConfirmPin(''), 1000);
                        }
                      }
                    }
                  }}
                  error={pinError || undefined}
                  disabled={walletConfirmPin.length === 6 && !pinError}
                />
              </div>

              {walletConfirmPin.length === 6 && !pinError && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-green-400 text-sm">✓ PIN confirmed. Ready to create your sovereign account.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Creating Sovereign - Parallel Progress */}
          {currentStep === 5 && (
            <div className="space-y-8 py-8 animate-in fade-in zoom-in-95 duration-1000">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto border-4 border-gold-primary border-t-transparent rounded-full animate-spin" />
                <h2 className="text-2xl font-serif text-gold-primary">Creating Your Sovereign Identity</h2>
                <p className="text-zinc-500 text-sm">Initializing systems. Please wait...</p>
              </div>

              {/* Parallel Progress Indicators */}
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-200">Bank of Siberia Wallet</p>
                      <p className="text-xs text-zinc-500">Generating cryptographic shares...</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-200">Citizen Identity</p>
                      <p className="text-xs text-zinc-500">Registering territorial binding...</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Log */}
              <div className="bg-black border border-zinc-800 rounded-lg p-4 font-mono text-xs max-h-40 overflow-y-auto">
                <div className="text-green-400">[SYSTEM] Initializing MPC protocol...</div>
                <div className="text-blue-400">[WALLET] Generating 256-bit entropy...</div>
                <div className="text-green-400">[WALLET] Splitting shares (2-of-3 threshold)...</div>
                <div className="text-blue-400">[IDENTITY] Binding to {selectedRegion?.name || 'territory'}...</div>
                <div className="text-green-400">[COMPLETE] Systems ready. Finalizing registration...</div>
              </div>
            </div>
          )}

          {/* Step 6: The Initiation - Final Summary */}
          {currentStep === 6 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-serif text-gold-primary">The Final Seal</h2>
                <div className="p-1 px-4 border border-gold-border bg-gold-surface/10 rounded-full inline-block text-[10px] tracking-widest uppercase text-gold-secondary animate-pulse">
                  Territory: {draft.basic.placeOfBirth.label || selectedRegion?.name || "UNSPECIFIED"}
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 border-y border-zinc-800 py-8">
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase font-mono">Region</p>
                  <p className="text-lg text-zinc-100 font-serif">{selectedRegion?.name || "N/A"}</p>
                </div>
                <div className="text-center border-x border-zinc-800">
                  <p className="text-zinc-600 text-[10px] uppercase font-mono">Nation</p>
                  <p className="text-lg text-zinc-100 font-serif">{selectedNation?.name || "N/A"}</p>
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
              disabled={currentStep === 0 || currentStep === 5 || loading}
              className="gap-2"
            >
              <ChevronLeft size={16} /> Back
            </Button>

            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
              Ritual Part {currentStep + 1} of {STEPS.length}
            </div>

            {currentStep < 4 && (
              <Button onClick={nextStep} className="gap-2 group">
                Continue <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
            
            {/* Step 4: Show "Create Wallet" when PIN is confirmed */}
            {currentStep === 4 && (
              <Button
                onClick={() => handleFinish()}
                disabled={walletPin.length !== 6 || walletConfirmPin.length !== 6 || !!pinError || loading}
                loading={loading}
                className="gap-2 min-w-[160px]"
              >
                Create Wallet <ArrowRight size={16} />
              </Button>
            )}
            
            {/* Step 5: Auto-progresses, no button needed */}
            {currentStep === 5 && (
              <div className="text-xs text-zinc-500 italic">Processing...</div>
            )}
            
            {/* Step 6: Final button to enter dashboard */}
            {currentStep === 6 && (
              <Button
                onClick={() => handleFinish()}
                loading={loading}
                className="gap-2 min-w-[160px]"
              >
                Enter the Khural <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
