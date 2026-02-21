"use client";

import * as React from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSeatBinding } from "@/lib/hooks/use-seat-binding";

import { Loader2, Link2, ShieldAlert, CheckCircle2 } from "lucide-react";

interface SeatBindingDialogProps {
  children?: React.ReactNode;
  trigger?: React.ReactNode;
}

export function SeatBindingDialog({ children, trigger }: SeatBindingDialogProps) {
  const { bindSeat, isLoading, error } = useSeatBinding();
  const [isOpen, setIsOpen] = React.useState(false);
  const [step, setStep] = React.useState<"input" | "processing" | "success">("input");
  
  const [formData, setFormData] = React.useState({
    seatId: "",
    walletAddress: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.seatId || !formData.walletAddress) return;

    setStep("processing");
    const success = await bindSeat(formData.seatId, formData.walletAddress);
    
    if (success) {
      setStep("success");
      // Auto close after success?
    } else {
      setStep("input");
    }
  };

  const resetForm = () => {
    setIsOpen(false);
    setTimeout(() => {
        setStep("input");
        setFormData({ seatId: "", walletAddress: "" });
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <Link2 className="h-5 w-5 text-gold-primary" />
             Bind Seat Identity
          </DialogTitle>
          <DialogDescription>
            Connect your physical Khural seat to your digital identity using your wallet and Seat Token ID.
          </DialogDescription>
        </DialogHeader>

        {step === "processing" ? (
           <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                 <div className="h-12 w-12 rounded-full border-2 border-zinc-800 border-t-gold-primary animate-spin" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-gold-primary" />
                 </div>
              </div>
              <div>
                 <h3 className="text-white font-medium">Verifying Ownership</h3>
                 <p className="text-sm text-zinc-500">Checking blockchain records...</p>
              </div>
           </div>
        ) : step === "success" ? (
           <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                 <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                 <h3 className="text-white font-medium text-lg">Identity Bound</h3>
                 <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                    Your seat has been successfully verified and bound to this session.
                 </p>
              </div>
              <Button onClick={resetForm} className="w-full mt-4">
                 Continue to Khural
              </Button>
           </div>
        ) : (
           <form onSubmit={handleSubmit} className="space-y-4 py-4">
              {error && (
                 <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3 text-sm text-red-200">
                    <ShieldAlert className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p>{error}</p>
                 </div>
              )}

              <div className="space-y-2">
                 <label className="text-xs font-medium text-zinc-400">Seat Token ID</label>
                 <Input 
                    placeholder="e.g. 1" 
                    value={formData.seatId}
                    onChange={(e) => setFormData(prev => ({ ...prev, seatId: e.target.value }))}
                    className="bg-black/20"
                    autoFocus
                 />
                 <p className="text-[10px] text-zinc-600">This is the ID of your NFT Seat Token.</p>
              </div>
              
              <div className="space-y-2">
                 <label className="text-xs font-medium text-zinc-400">Wallet Address</label>
                 <Input 
                    placeholder="0x..." 
                    value={formData.walletAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
                    className="bg-black/20"
                 />
                 <p className="text-[10px] text-zinc-600">The wallet that owns the Seat Token.</p>
              </div>

              <DialogFooter>
                 <Button type="submit" disabled={!formData.seatId || !formData.walletAddress} className="w-full sm:w-auto">
                    Verify & Bind
                 </Button>
              </DialogFooter>
           </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
