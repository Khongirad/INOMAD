"use client";

import * as React from "react";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  Landmark, 
  Activity, 
  ChevronRight,
  ShieldCheck,
  RefreshCcw,
  User,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import { useAltan } from "@/lib/hooks/use-altan";
import { useSeatBinding } from "@/lib/hooks/use-seat-binding";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { balance, history, loading: balanceLoading } = useAltan();
  const { status: seatStatus } = useSeatBinding();
  // const [sendOpen, setSendOpen] = React.useState(false); // Replaced by Dialog
  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [taxOpen, setTaxOpen] = React.useState(false);

  return (
    <>
    <div className="p-6 lg:p-8 space-y-8 animate-in">
     {/* ... rest of the dashboard ... */}
     {/* I need to make sure I don't accidentally remove the dashboard content.
         The Search/Replace tool needs precise targeting. 
         Wait, I see I'm replacing lines 1-16 which imports and start of component.
         But I need to inject the SHEET components at the end of the return, and updated handlers.
         
         Better approach: Use replace_file_content to:
         1. Add imports.
         2. Add state hooks inside component.
         3. Add onClick handlers to buttons.
         4. Add Sheet JSX at the end of the div.
         
         Actually, creating a fully new file content might be safer/cleaner since I'm changing a lot (state wrapping).
         But let's try surgical replacements.
     */}
      {/* Top Config / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Cockpit Overview
          </h2>
          <p className="text-zinc-400">
            Welcome back, <span className="text-zinc-200 font-medium">Alex Nomad</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <RefreshCcw className="mr-2 h-4 w-4" /> Sync State
          </Button>
          <Button variant="primary" size="sm">
            <ShieldCheck className="mr-2 h-4 w-4" /> Verified Citizen
          </Button>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <Card className="border-gold-border/30 bg-gradient-to-br from-zinc-900/80 to-black relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-50">
             <Landmark className="h-16 w-16 text-gold-surface" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-white">
              {balanceLoading ? (
                 <span className="animate-pulse text-zinc-600">...</span>
              ) : (
                 balance.toLocaleString('en-US', { minimumFractionDigits: 2 })
              )} <span className="text-gold-primary text-lg">ALT</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              ≈ ${(balance * 1.0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
            </p>
            <div className="mt-4 flex gap-2">
               <TransactionDialog>
                   <Button size="sm" className="w-full">
                     <ArrowUpRight className="mr-2 h-3 w-3" /> Send
                   </Button>
               </TransactionDialog>
               <Button size="sm" variant="secondary" className="w-full" onClick={() => setReceiveOpen(true)}>
                 <ArrowDownLeft className="mr-2 h-3 w-3" /> Receive
               </Button>
            </div>
          </CardContent>
        </Card>

        {/* Governance Power */}
        <Card className="border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Governance Power
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-white">
              850 <span className="text-zinc-500 text-lg">VP</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Voting Power based on contribution
            </p>
            <div className="mt-4">
               <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                 <div className="h-full bg-gradient-to-r from-zinc-500 to-white w-[65%]" />
               </div>
               <div className="mt-2 flex justify-between text-xs text-zinc-400">
                 <span>Level 4 Citizen</span>
                 <span>65% to Level 5</span>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Status */}
        <Card className="border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Tax Obligation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-white">
              120.00 <span className="text-zinc-500 text-lg">ALT</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Due in 14 days
            </p>
            <div className="mt-4 text-right">
              <Button size="sm" variant="secondary" className="w-full border-zinc-700 text-zinc-300 hover:text-white" onClick={() => setTaxOpen(true)}>
                <FileText className="mr-2 h-3 w-3" /> View Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Recent Activity (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Recent Activity</h3>
            <Button variant="ghost" size="sm" className="text-xs">View All</Button>
          </div>
          

          <div className="space-y-3">
            {history.length === 0 ? (
               <div className="p-8 text-center text-zinc-500 bg-zinc-900/40 rounded-xl border border-white/5">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No transactions yet</p>
               </div>
            ) : (
                history.map((tx) => {
                  const isIncoming = tx.toUser?.seatId === seatStatus?.seatId;
                  const otherParty = isIncoming ? tx.fromUser : tx.toUser;
                  
                  return (
                  <div key={tx.id} className="group flex items-center justify-between rounded-xl border border-white/5 bg-zinc-900/40 p-4 transition hover:bg-zinc-900/60 hover:border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-zinc-400 group-hover:bg-gold-surface group-hover:text-gold-primary transition-colors">
                        {isIncoming ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-200">
                          {isIncoming ? `Received from Seat #${otherParty?.seatId || 'System'}` : `Sent to Seat #${otherParty?.seatId || 'External'}`}
                        </div>
                        <div className="text-xs text-zinc-500">{new Date(tx.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("font-mono font-medium", isIncoming ? "text-emerald-500" : "text-zinc-200")}>
                        {isIncoming ? "+" : "-"}{Number(tx.amount).toFixed(2)} ALT
                      </div>
                      <div className="text-xs text-zinc-600 uppercase">{tx.type}</div>
                    </div>
                  </div>
                );
               })
            )}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-bold text-white mb-4">Active Proposals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[1, 2].map((_, i) => (
                 <Card key={i} className="bg-black/20 hover:bg-black/40 transition border-white/5">
                   <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Voting Open</span>
                        <span className="text-xs text-zinc-500">Ends in 2d</span>
                      </div>
                      <h4 className="font-semibold text-zinc-200 leading-tight mb-2">
                        {i === 0 ? "Proposal #142: Increase Education Budget for Aimag 4" : "Proposal #143: Ratify New Trade Agreement"}
                      </h4>
                      <div className="w-full bg-zinc-800/50 h-1.5 rounded-full overflow-hidden mt-3">
                        <div className="bg-zinc-500 h-full w-[70%]" />
                      </div>
                      <div className="flex justify-between text-xs text-zinc-500 mt-1">
                        <span>70% For</span>
                        <span>125 Votes</span>
                      </div>
                   </CardContent>
                 </Card>
               ))}
            </div>
          </div>
        </div>

        {/* Right: Quick Actions / Widgets (1 col) */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-b from-zinc-900 to-black border-white/10">
            <CardHeader>
              <CardTitle className="text-base text-zinc-200">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="secondary" className="w-full justify-between group" onClick={() => setTaxOpen(true)}>
                 <span>Pay State Tax</span>
                 <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-gold-primary" />
              </Button>
              <Button variant="secondary" className="w-full justify-between group">
                 <span>Sign Contract</span>
                 <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-gold-primary" />
              </Button>
              <Button variant="secondary" className="w-full justify-between group">
                 <span>Register Property</span>
                 <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-gold-primary" />
              </Button>
               <Button variant="secondary" className="w-full justify-between group">
                 <span>Khural Voting</span>
                 <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-gold-primary" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-zinc-900/20">
             <CardContent className="p-5">
               <div className="text-xs text-zinc-500 font-mono mb-2">NETWORK STATUS</div>
               <div className="flex items-center gap-2 mb-4">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-sm font-medium text-emerald-500">Operational</span>
               </div>
               <div className="space-y-2 text-xs text-zinc-400">
                 <div className="flex justify-between">
                   <span>Block Height</span>
                   <span className="font-mono text-zinc-300">14,205,992</span>
                 </div>
                 <div className="flex justify-between">
                   <span>TPS</span>
                   <span className="font-mono text-zinc-300">1,420</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Gas Price</span>
                   <span className="font-mono text-zinc-300">0.0001 ALT</span>
                 </div>
               </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>



    {/* RECEIVE SHEET */}
    <Sheet open={receiveOpen} onOpenChange={setReceiveOpen} title="Receive Assets">
       <div className="space-y-8 pt-6 flex flex-col items-center text-center">
         <div className="h-48 w-48 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
            {/* QR Placeholder */}
            <div className="grid grid-cols-6 gap-1 opacity-50">
               {[...Array(36)].map((_, i) => (
                  <div key={i} className={`h-2 w-2 ${Math.random() > 0.5 ? 'bg-white' : 'bg-transparent'}`} />
               ))}
            </div>
         </div>
         
         <div className="space-y-2 w-full">
            <label className="text-sm font-medium text-zinc-400">Your Address</label>
            <div className="flex gap-2">
               <Input value="0x71C...92F" readOnly className="font-mono text-center text-zinc-300" />
               <Button variant="secondary" size="icon"><CheckCircle2 className="h-4 w-4" /></Button>
            </div>
         </div>
       </div>
    </Sheet>

    {/* TAX SHEET */}
    <Sheet open={taxOpen} onOpenChange={setTaxOpen} title="Tax Obligation">
       <div className="space-y-6 pt-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10">
             <div className="text-sm text-zinc-500 mb-2">Total Taxable Income (YTD)</div>
             <div className="text-2xl font-mono text-white">120,400.00 ALT</div>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-md">
                <span className="text-zinc-400">State Tax (10%)</span>
                <span className="font-mono text-white">12,040.00 ALT</span>
             </div>
             <div className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-md">
                <span className="text-zinc-400">Already Paid</span>
                <span className="font-mono text-emerald-500">- 11,920.00 ALT</span>
             </div>
             <div className="flex justify-between items-center text-lg font-bold p-3 border border-gold-border/30 bg-gold-surface/10 rounded-md">
                <span className="text-gold-primary">Remaining Due</span>
                <span className="font-mono text-white">120.00 ALT</span>
             </div>
          </div>

          <Button className="w-full h-12 text-base font-bold bg-gradient-to-r from-zinc-800 to-zinc-700 hover:from-zinc-700 hover:to-zinc-600 border border-white/10">
             Pay 120.00 ALT
          </Button>

          <p className="text-xs text-center text-zinc-500">
            Contributions fund the Sovereign Wealth Fund and public services.
          </p>
       </div>
    </Sheet>
    </>
  );
}

