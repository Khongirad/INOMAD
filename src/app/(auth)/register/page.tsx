"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const STEPS = [
  { id: "land", title: "The Call of the Land", description: "Declare your territorial origin", icon: MapPin },
  { id: "identity", title: "Blood & Identity", description: "Select your ethnicity and clan", icon: User },
  { id: "proof", title: "Social Proof", description: "Extracting data for verification", icon: ShieldCheck },
  { id: "initiation", title: "The Initiation", description: "Enter the sovereign order", icon: Globe },
];

export default function RegistrationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    birthPlace: {
      country: "Buryatia / Mongolie",
      region: "",
      district: "",
      city: "",
    },
    ethnicity: [] as string[],
    clan: "",
  });

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const handleFinish = async () => {
    setLoading(true);
    try {
      // 1. Register User (Backend Ritual)
      const res = await api.post<any>("identity/register", {
        birthPlace: formData.birthPlace,
        ethnicity: formData.ethnicity,
        clan: formData.clan,
      });

      // 2. Save Seat ID for subsequent authenticated requests
      if (res.user?.seatId) {
        api.setSeatId(res.user.seatId);
      }

      // 3. Redirect to verification status page (Verification Hall)
      router.push("/identity/verification");
    } catch (error) {
      console.error("Registration failed", error);
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
                  currentStep >= idx ? "border-gold-primary bg-gold-primary/10 text-gold-primary shadow-gold-glow/20 shadow-lg" : "border-zinc-800 text-zinc-600"
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
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2 className="text-2xl font-serif text-zinc-100 flex items-center gap-3">
                <MapPin className="text-gold-primary" /> Select Your Land
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Every citizen is bound to territory. Your registration assigns you to a **Tumen (10,000)** based on your birthplace.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Birth Country</Label>
                  <Input placeholder="Country" value={formData.birthPlace.country} readOnly className="bg-zinc-950/50 border-zinc-800 text-zinc-400" />
                </div>
                <div className="space-y-2">
                  <Label>Macro-Region / State</Label>
                  <Input 
                    placeholder="e.g. Baikal, Altai" 
                    value={formData.birthPlace.region}
                    onChange={(e) => setFormData({...formData, birthPlace: {...formData.birthPlace, region: e.target.value}})}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>District / City</Label>
                  <Input 
                    placeholder="e.g. Ulan-Ude, Irkutsk" 
                    value={formData.birthPlace.city}
                    onChange={(e) => setFormData({...formData, birthPlace: {...formData.birthPlace, city: e.target.value}})}
                  />
                </div>
              </div>

              {/* Map Placeholder Visual */}
              <div className="h-48 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center text-zinc-600 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                <Globe size={48} className="animate-pulse text-gold-primary/20" />
                <p className="mt-2 text-[10px] tracking-widest uppercase text-zinc-700">Population allocation enabled</p>
                <div className="absolute bottom-2 right-2 text-[10px] font-mono text-gold-secondary/40">TUMEN_ALLOCATION_MODE: ON</div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
              <h2 className="text-2xl font-serif text-zinc-100 flex items-center gap-3">
                <Users className="text-gold-primary" /> Identity & Bloodline
              </h2>
              <p className="text-zinc-500 text-sm">
                Ethnicity is independent of territory. Your cultural identity is preserved, but state responsibility is territorial.
              </p>

              <div className="space-y-4">
                <Label>Select Primary Ethnicity</Label>
                <div className="grid grid-cols-2 gap-3">
                   {["Buryat", "Mongol", "Russian", "Evenk", "Soyot", "Other"].map(eth => (
                     <button
                        key={eth}
                        onClick={() => {
                          const current = formData.ethnicity;
                          if (current.includes(eth)) {
                            setFormData({...formData, ethnicity: current.filter(e => e !== eth)});
                          } else {
                            setFormData({...formData, ethnicity: [...current, eth]});
                          }
                        }}
                        className={cn(
                          "p-4 rounded-xl border-2 text-left transition-all duration-300 flex items-center justify-between",
                          formData.ethnicity.includes(eth) 
                            ? "border-gold-primary bg-gold-primary/10 text-gold-primary shadow-inner" 
                            : "border-zinc-800 bg-zinc-950/30 text-zinc-500 hover:border-zinc-700"
                        )}
                     >
                       <span className="font-mono text-sm tracking-widest uppercase">{eth}</span>
                       {formData.ethnicity.includes(eth) && <ShieldCheck size={16} />}
                     </button>
                   ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Clan / Rod (Optional)</Label>
                <Input 
                  placeholder="e.g. Khongirad, Ekhirit" 
                  value={formData.clan}
                  onChange={(e) => setFormData({...formData, clan: e.target.value})}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
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

          {currentStep === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-serif text-gold-primary">The Final Seal</h2>
                <div className="p-1 px-4 border border-gold-border bg-gold-surface/10 rounded-full inline-block text-[10px] tracking-widest uppercase text-gold-secondary animate-pulse">
                  Territory: {formData.birthPlace.city || "UNSPECIFIED"}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-y border-zinc-800 py-8">
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase font-mono">Seat State</p>
                  <p className="text-xl text-zinc-100 font-serif">UNVERIFIED</p>
                </div>
                <div className="text-center border-x border-zinc-800">
                  <p className="text-zinc-600 text-[10px] uppercase font-mono">Hierarchy</p>
                  <p className="text-xl text-zinc-100 font-serif">PENDING</p>
                </div>
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase font-mono">Wallet Status</p>
                  <p className="text-xl text-zinc-100 font-serif line-through decoration-red-500/50">LOCKED</p>
                </div>
              </div>

              <p className="text-center text-zinc-500 text-sm max-w-lg mx-auto italic">
                "To enter the Khural is to accept responsibility for your land and your people."
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
              Ritual Part {currentStep + 1} of 4
            </div>

            {currentStep < 3 ? (
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
