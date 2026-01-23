"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBank } from "@/lib/hooks/use-bank";
import { bankApi } from "@/lib/bank/bank-api";
import { Loader2, Send, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function TransactionDialog({ children }: { children: React.ReactNode }) {
  const { transfer, loading, hasTicket } = useBank();
  const [isOpen, setIsOpen] = React.useState(false);

  const [step, setStep] = React.useState<"input" | "confirm" | "success">("input");
  const [recipientRef, setRecipientRef] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [memo, setMemo] = React.useState("");

  const [recipientValid, setRecipientValid] = React.useState(false);
  const [recipientBankCode, setRecipientBankCode] = React.useState<string | null>(null);
  const [isResolving, setIsResolving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Debounced bankRef resolution
  React.useEffect(() => {
    if (!recipientRef || recipientRef.length < 8) {
      setRecipientValid(false);
      setRecipientBankCode(null);
      return;
    }

    const timer = setTimeout(async () => {
      if (!hasTicket) return;
      setIsResolving(true);
      setRecipientValid(false);
      setRecipientBankCode(null);
      try {
        const data = await bankApi.resolve(recipientRef);
        setRecipientValid(data.exists);
        setRecipientBankCode(data.bankCode);
      } catch {
        setRecipientValid(false);
      } finally {
        setIsResolving(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [recipientRef, hasTicket]);

  const handleTransfer = async () => {
    setError(null);
    try {
      await transfer(recipientRef, Number(amount), memo || undefined);
      setStep("success");
    } catch (e: any) {
      setError(e.message || "Transfer failed");
    }
  };

  const reset = () => {
    setIsOpen(false);
    setTimeout(() => {
      setStep("input");
      setRecipientRef("");
      setAmount("");
      setMemo("");
      setRecipientValid(false);
      setRecipientBankCode(null);
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
            Send tokens to a verified bank account.
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4 py-4">
            {/* Recipient Input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400">Recipient Bank Reference</label>
              <div className="relative">
                <Input
                  value={recipientRef}
                  onChange={(e) => setRecipientRef(e.target.value)}
                  placeholder="Enter bank reference ID"
                  className={cn(
                    "pr-8 font-mono text-sm transition-colors",
                    recipientValid && "border-emerald-500/50 focus:border-emerald-500"
                  )}
                />
                <div className="absolute right-3 top-2.5">
                  {isResolving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                  ) : recipientValid ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  ) : null}
                </div>
              </div>

              {recipientValid && recipientBankCode && (
                <p className="text-xs text-emerald-500">
                  Verified account at {recipientBankCode}
                </p>
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

            {/* Memo Input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400">Memo (optional)</label>
              <Input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Payment for..."
                className="text-sm"
              />
            </div>

            <Button
              className="w-full mt-4"
              disabled={!recipientValid || !amount || Number(amount) <= 0}
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
                <span className="text-white font-mono text-xs">{recipientRef.substring(0, 8)}...{recipientRef.substring(recipientRef.length - 4)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Amount</span>
                <span className="text-gold-primary font-bold text-lg">{amount} ALT</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Fee (0.03%)</span>
                <span className="text-zinc-400 font-mono">{(Number(amount) * 0.0003).toFixed(4)} ALT</span>
              </div>
              {memo && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Memo</span>
                  <span className="text-zinc-300 text-xs truncate max-w-[150px]">{memo}</span>
                </div>
              )}
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
              You sent {amount} ALT successfully.
            </p>
            <Button onClick={reset} className="w-full">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
