"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Users,
  MapPin,
  Fingerprint,
  AlertTriangle,
  QrCode,
  Share2,
  CheckCircle2,
  Clock,
  Wallet,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export default function VerificationHallPage() {
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const seatId = api.getSeatId();
        if (!seatId) {
            router.push("/register");
            return;
        }
        // Fetch status by seatId or userId. 
        // Our API supports status/:userId, but we can also add status/me
        const res = await api.get(`identity/status/${seatId}`); 
        setStatus(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const verifications = status?.verificationsReceived || [];
  const required = 3;
  const progress = (verifications.length / required) * 100;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 p-8 pt-24">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-serif text-gold-primary tracking-widest uppercase">
              The Hall of Verification
            </h1>
            <p className="text-zinc-500 font-mono text-xs tracking-wider">
              SOVEREIGN STATUS: <span className="text-gold-secondary">{status?.verificationStatus || "PENDING_SOCIAL_PROOF"}</span>
            </p>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" className="gap-2 border-gold-border font-mono text-xs uppercase tracking-widest">
                <Share2 size={14} /> Invite Verifiers
             </Button>
             <Button variant="primary" className="gap-2 font-mono text-xs uppercase tracking-widest px-8">
                <QrCode size={14} /> My Code
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Status Column */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-10 bg-zinc-900/40 border-zinc-800 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <ShieldCheck size={120} />
                </div>
                
                <h2 className="text-2xl font-serif mb-8 flex items-center gap-3">
                   <Users className="text-gold-primary" /> Social Proof Quorum
                </h2>

                <div className="space-y-12">
                    {/* Progress Visual */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-xs font-mono text-zinc-500 uppercase">Verification Progress</span>
                            <span className="text-3xl font-serif text-gold-primary">{verifications.length} / {required}</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                             <div 
                                className="h-full bg-gradient-to-r from-gold-primary to-amber-600 shadow-[0_0_20px_rgba(219,180,95,0.4)] transition-all duration-1000" 
                                style={{ width: `${progress}%` }}
                             />
                        </div>
                        <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest text-center mt-2">
                            3 verified signatures from locals required
                        </p>
                    </div>

                    {/* Slots Visual */}
                    <div className="grid grid-cols-3 gap-6">
                         {[1, 2, 3].map(slot => {
                             const signature = verifications[slot-1];
                             return (
                                <div 
                                    key={slot} 
                                    className={cn(
                                        "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-500",
                                        signature 
                                          ? "border-gold-primary/50 bg-gold-primary/5 text-gold-primary shadow-lg" 
                                          : "border-zinc-800 border-dashed bg-zinc-950/50 text-zinc-700"
                                    )}
                                >
                                    {signature ? (
                                        <>
                                            <CheckCircle2 size={32} />
                                            <p className="text-[10px] font-mono uppercase tracking-tighter">Verified</p>
                                            <p className="text-[8px] text-zinc-500 opacity-60">
                                                {signature.verifierSeatId || "SEAT_XXXX"}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Fingerprint size={24} className="opacity-20" />
                                            <p className="text-[10px] font-mono uppercase tracking-tighter">Waiting...</p>
                                        </>
                                    )}
                                </div>
                             )
                         })}
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-6">
                <Card className="p-6 bg-zinc-900/30 border-zinc-800">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                        <MapPin size={14} /> Assigned Locality
                    </h3>
                    <div className="space-y-1">
                        <p className="text-xl font-serif text-zinc-200">
                            {status?.khuralSeats?.[0]?.group?.name || "Initializing..."}
                        </p>
                        <p className="text-[10px] text-zinc-600 font-mono">
                            LEVEL: {status?.khuralSeats?.[0]?.group?.level || "TBD"}
                        </p>
                    </div>
                </Card>
                <Card className="p-6 bg-zinc-900/30 border-zinc-800">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-amber-500" /> Responsibility
                    </h3>
                    <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                        Verifiers ({status?.verificationsReceived?.length || 0}/3) are legally responsible for your social bond. Any protocol failure results in shared penalties.
                    </p>
                </Card>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
             <Card className="p-6 bg-zinc-900/40 border-zinc-800 backdrop-blur-sm">
                 <h4 className="text-xs font-bold uppercase mb-4 flex items-center gap-2 text-zinc-400">
                    <Wallet size={16} /> Sovereign Wallet
                 </h4>
                 <div className="space-y-4">
                     <div className="flex items-center justify-between">
                         <span className="text-[10px] font-mono text-zinc-500">STATUS</span>
                         <span className={cn(
                             "text-[10px] font-mono px-2 py-0.5 rounded",
                             status?.walletStatus === 'UNLOCKED' 
                               ? "bg-green-500/10 text-green-500 border border-green-500/20"
                               : "bg-red-500/10 text-red-500 border border-red-500/20"
                         )}>
                             {status?.walletStatus || "LOCKED"}
                         </span>
                     </div>
                     <div className="p-3 bg-black/40 rounded border border-zinc-800 flex items-center justify-between gap-4">
                         <div className="flex items-center gap-2">
                            <Lock size={12} className="text-zinc-600" />
                            <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">
                                {status?.walletAddress || "0x000...000"}
                            </span>
                         </div>
                         <div className="text-[8px] text-zinc-700 uppercase font-bold">Encrypted</div>
                     </div>
                     <p className="text-[9px] text-zinc-600 leading-relaxed italic">
                        {status?.walletStatus === 'UNLOCKED' 
                          ? "Sovereign wallet is active and authenticated."
                          : "Wallet is cryptographically locked until the ritual of entry is complete."}
                     </p>
                 </div>
             </Card>

             <Card className="p-6 bg-gold-surface/5 border-gold-border text-gold-secondary">
                 <h4 className="text-xs font-bold uppercase mb-3 flex items-center gap-2">
                    <ShieldCheck size={16} /> Standard Rule
                 </h4>
                 <p className="text-xs leading-relaxed opacity-80 mb-4">
                    To prevent anonymous state entry, you must reach out to citizens in your area.
                 </p>
                 <div className="flex flex-col gap-2">
                     <div className="flex items-center gap-3 text-[10px] bg-black/20 p-2 rounded border border-white/5">
                        <Clock size={12} />
                        <span>Average wait time: 4-8 hours</span>
                     </div>
                 </div>
             </Card>

              {/* Verify Peer Section (Only for Verified Users) */}
              {status?.verificationStatus === 'VERIFIED' && (
                <Card className="p-6 bg-gold-primary/10 border-gold-primary/30">
                    <h4 className="text-xs font-bold uppercase mb-4 text-gold-primary flex items-center gap-2">
                        <Fingerprint size={16} /> Verify a Peer
                    </h4>
                    <p className="text-[10px] text-zinc-400 mb-4 italic leading-relaxed">
                        Enter the Seat ID of a resident in your local Zuud to sign their social proof bond.
                    </p>
                    <div className="flex gap-2">
                        <input 
                            placeholder="SEAT_ID" 
                            className="bg-black/40 border border-zinc-800 rounded px-2 py-1 text-xs font-mono grow text-zinc-200"
                            id="peerSeatId"
                        />
                        <Button 
                            className="text-[10px] h-8"
                            onClick={async () => {
                                const seatId = (document.getElementById('peerSeatId') as HTMLInputElement).value;
                                if (!seatId) return;
                                try {
                                    await api.post('identity/verify', { targetUserId: seatId });
                                    alert('Social Proof Signed Successfully');
                                    window.location.reload();
                                } catch (e: any) {
                                    alert(e.message);
                                }
                            }}
                        >
                            SIGN
                        </Button>
                    </div>
                </Card>
              )}

              <Card className="p-6 bg-zinc-900/20 border-zinc-800">
                <h4 className="text-xs font-bold uppercase mb-4 text-zinc-400">Founder Mandates</h4>
                <div className="space-y-4">
                    <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                        Founder's Arbad holders can bypass this protocol using **Super-Verification**.
                    </p>
                    {status?.isFounderMandateHolder && (
                         <Button 
                            variant="outline" 
                            className="w-full text-[10px] border-amber-900 text-amber-500 hover:bg-amber-950/20"
                            onClick={async () => {
                                const targetId = prompt("Enter User ID or Seat ID to Super-Verify:");
                                if (!targetId) return;
                                try {
                                    await api.post('identity/super-verify', { targetUserId: targetId, justification: 'Direct Founder Authorization' });
                                    alert('Super-Verification Completed');
                                    window.location.reload();
                                } catch (e: any) {
                                    alert(e.message);
                                }
                            }}
                         >
                            ACTIVATE SUPER-VERIFICATION
                         </Button>
                    )}
                    <div className="space-y-2 opacity-30 grayscale cursor-not-allowed">
                         <div className="h-8 border border-zinc-700 bg-zinc-800 rounded flex items-center justify-between px-3">
                            <span className="text-[10px] font-mono">MANDATE_BAIR_IVANOV</span>
                            <span className="text-[8px] bg-gold-primary/20 text-gold-primary px-1">ACTIVE</span>
                         </div>
                    </div>
                </div>
              </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
