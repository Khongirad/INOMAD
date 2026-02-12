'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  UserPlus, 
  Users, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';

export default function UnlockCeremonyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState<'LOCKED' | 'PENDING' | 'UNLOCKED'>('LOCKED');
  const [approvals, setApprovals] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get seat ID from auth
    const seatId = user?.seatId || null;
    if (seatId) setUserId(seatId);

    const checkStatus = async () => {
       if (!seatId) return;
       try {
         const data = await api.get<{ walletStatus: string, unlockRequest: any }>(`identity/status/${seatId}`);
         setStatus(data.walletStatus as any || 'LOCKED');
         if (data.unlockRequest && data.unlockRequest.approvals) {
           setApprovals(data.unlockRequest.approvals);
         }
       } catch (e) {
         console.warn("Failed to fetch status", e);
       }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleRequest = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      await api.post('identity/unlock/request', { userId });
      setStatus('PENDING');
    } catch (e) {
      alert("Error requesting unlock");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      await api.post('identity/unlock/finalize', { userId });
      setStatus('UNLOCKED');
    } catch (e) {
      alert("Quorum not reached or error finalizing.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Visuals ---

  const ApprovalSlot = ({ index, approval }: { index: number, approval?: any }) => {
     return (
        <div className={`
          relative w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-500
          ${approval 
            ? 'border-green-500 bg-green-950/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
            : 'border-zinc-800 bg-zinc-900 border-dashed'}
        `}>
           {approval ? (
             <>
               <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center mb-1">
                 <CheckCircle className="text-black w-5 h-5" />
               </div>
               <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">{approval.approver.seatId.substring(0,8)}</span>
               <span className="text-[9px] text-zinc-500">Authorized</span>
             </>
           ) : (
             <div className="text-center">
               <UserPlus className="w-6 h-6 text-zinc-700 mx-auto mb-1" />
               <span className="text-[10px] text-zinc-600 uppercase">Waiting</span>
             </div>
           )}
           
           {/* Connector Line */}
           {index < 2 && (
             <div className="absolute top-1/2 -right-12 w-12 h-0.5 bg-zinc-800" />
           )}
        </div>
     );
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/10 via-black to-black pointer-events-none" />
      
      <div className="z-10 max-w-2xl w-full space-y-12 text-center">
        
        {/* Header */}
        <div>
          <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/30 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Activation Ceremony</h1>
          <p className="text-zinc-400">
            Sovereignty is not granted; it is recognized by your peers. <br/>
            Obtain 3 signatures to activate your Altan Wallet.
          </p>
        </div>

        {/* State Machine UI */}
        
        {status === 'LOCKED' && (
           <Card className="bg-zinc-900/50 border-zinc-800 p-8">
             <div className="mb-6">
               <h3 className="text-xl text-white font-bold mb-2">Step 1: Initiate Protocol</h3>
               <p className="text-zinc-500 text-sm">
                 This will broadcast your request to your Arban (local unit).
               </p>
             </div>
             <Button 
               onClick={handleRequest} 
               disabled={isLoading}
               size="lg" 
               className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 py-6 text-lg rounded-full shadow-[0_0_20px_rgba(217,119,6,0.4)]"
             >
               {isLoading ? "Initiating..." : "Begin Ceremony"}
             </Button>
           </Card>
        )}

        {status === 'PENDING' && (
           <div className="space-y-8">
             <div className="flex justify-center items-center gap-12">
                {[0, 1, 2].map(i => (
                  <ApprovalSlot key={i} index={i} approval={approvals[i]} />
                ))}
             </div>
             
             <div className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-lg max-w-md mx-auto">
               <div className="flex items-center gap-3 text-amber-500">
                 <AlertCircle className="w-5 h-5 animate-pulse" />
                 <span className="text-sm font-medium">
                   Request Pending. Waiting for 3 peers...
                 </span>
               </div>
             </div>

             <Button
               onClick={handleFinalize}
               disabled={approvals.length < 3 || isLoading}
               className={`
                 w-full max-w-md py-6 text-lg font-bold transition-all duration-500
                 ${approvals.length >= 3 
                   ? 'bg-green-600 hover:bg-green-700 text-white shadow-[0_0_30px_rgba(22,163,74,0.5)]' 
                   : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
               `}
             >
               {isLoading ? "Finalizing..." : "Finalize Activation"}
             </Button>
           </div>
        )}

        {status === 'UNLOCKED' && (
            <div className="animate-in fade-in zoom-in duration-1000">
              <div className="mx-auto w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/50 mb-6 shadow-[0_0_50px_rgba(34,197,94,0.4)]">
                <ShieldCheck className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Sovereign Identity Active</h2>
              <p className="text-zinc-400 mb-8">
                Your wallet is unlocked. You may now participate in the Khural.
              </p>
              <Button onClick={() => router.push('/dashboard')} variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
                Enter State OS
              </Button>
            </div>
        )}

      </div>
    </div>
  );
}
