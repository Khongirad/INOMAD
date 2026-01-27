"use client";

import * as React from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAltan } from "@/lib/hooks/use-altan";
import { Loader2, Send, Wallet, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function TransactionDialog({ children }: { children: React.ReactNode }) {
  const { transfer, resolveUser, loading } = useAltan();
  const [isOpen, setIsOpen] = React.useState(false);
  
  const [step, setStep] = React.useState<"input" | "confirm" | "success">("input");
  const [recipientId, setRecipientId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  
  const [recipientData, setRecipientData] = React.useState<any>(null);
  const [isResolving, setIsResolving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Debounced resolution
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (recipientId.length >= 1) { // Resolve even seat ID "1"
        setIsResolving(true);
        setError(null);
        setRecipientData(null);
        try {
          // In real app, we suppress 404 logs
          const data = await resolveUser(recipientId);
          setRecipientData(data);
        } catch (e) {
          // Ignore 404 during typing, but reset data
        } finally {
          setIsResolving(false);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [recipientId, resolveUser]);

  const handleTransfer = async () => {
    try {
        await transfer(recipientId, Number(amount));
        setStep("success");
    } catch (e: any) {
        setError(e.message || "Transfer failed");
    }
  };

  const reset = () => {
    setIsOpen(false);
    setTimeout(() => {
        setStep("input");
        setRecipientId("");
        setAmount("");
        setRecipientData(null);
        setError(null);
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-gold-primary" />
            Transfer ALTAN
          </DialogTitle>
          <DialogDescription>
            Send tokens securely to verified Khural members.
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
            <div className="space-y-4 py-4">
                {/* Recipient Input */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400">Recipient (Seat ID)</label>
                    <div className="relative">
                        <Input 
                            value={recipientId}
                            onChange={(e) => setRecipientId(e.target.value)}
                            placeholder="e.g. 1"
                            className={cn(
                                "pr-8 transition-colors",
                                recipientData && "border-emerald-500/50 focus:border-emerald-500"
                            )}
                        />
                        <div className="absolute right-3 top-2.5">
                            {isResolving ? (
                                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                            ) : recipientData ? (
                                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            ) : null}
                        </div>
                    </div>

                    {/* Recipient Preview Card */}
                    {recipientData && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-white/5 animate-in slide-in-from-top-2 fade-in">
                            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                <User className="h-4 w-4 text-zinc-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">Seat #{recipientData.seatId} ({recipientData.role})</p>
                                <p className="text-xs text-zinc-500">{recipientData.organization || "No Guild"}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400">Amount</label>
                    <div className="relative">
                        <Input 
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="text-right pr-12 font-mono text-lg"
                        />
                        <div className="absolute right-3 top-3 text-xs font-bold text-gold-primary">ALT</div>
                    </div>
                </div>

                <Button 
                    className="w-full mt-4" 
                    disabled={!recipientData || !amount || Number(amount) <= 0}
                    onClick={() => setStep("confirm")}
                >
                    Review Transfer
                </Button>
            </div>
        )}

        {step === "confirm" && (
            <div className="space-y-6 py-4">
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">To</span>
                        <span className="text-white font-medium">Seat #{recipientData?.seatId}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Amount</span>
                        <span className="text-gold-primary font-bold text-lg">{amount} ALT</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Fee (Tier 2)</span>
                        <span className="text-emerald-500">Free</span>
                    </div>
                </div>

                {error && (
                     <p className="text-xs text-red-400 text-center bg-red-950/20 p-2 rounded">{error}</p>
                )}

                <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={() => setStep("input")}>Cancel</Button>
                    <Button className="flex-1 bg-gold-primary text-black hover:bg-gold-light" onClick={handleTransfer} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Send"}
                    </Button>
                </div>
            </div>
        )}

        {step === "success" && (
             <div className="py-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                 <div className="h-16 w-16 rounded-full bg-gold-primary/10 flex items-center justify-center mb-4 text-gold-primary">
                     <Send className="h-8 w-8" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">Transfer Sent</h3>
                 <p className="text-zinc-400 text-sm max-w-[200px] mb-6">
                     You sent {amount} ALT to Seat #{recipientData?.seatId}.
                 </p>
                 <Button onClick={reset} className="w-full">Done</Button>
             </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
