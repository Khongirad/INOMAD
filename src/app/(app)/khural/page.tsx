"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CircleLayout } from "@/components/visual/circle-layout";
import { SeatProps } from "@/components/community/seat";
import { ProfessionBadge } from "@/components/identity/profession-badge";
import { Eye, ChevronRight } from "lucide-react";

export default function KhuralPage() {
  const [viewLevel, setViewLevel] = React.useState<"arban" | "zuun">("arban");

  const [selectedSeat, setSelectedSeat] = React.useState<string | null>(null);

  // MOCK DATA FOR ARBAN (10)
  const baseArbanMembers: Omit<SeatProps, "isSelected">[] = [
    { id: "1", status: "occupied", role: "leader", member: { name: "Alex Nomad", profession: "Architect", level: 5 } },
    { id: "2", status: "occupied", role: "elder", member: { name: "Sarah Connor", profession: "Healer", level: 8 } },
    { id: "3", status: "occupied", member: { name: "John Doe", profession: "Builder", level: 2 } },
    { id: "4", status: "occupied", member: { name: "Jane Smith", profession: "Notary", level: 3 } },
    { id: "5", status: "empty" },
    { id: "6", status: "occupied", member: { name: "Bato", profession: "Herder", level: 1 } },
    { id: "7", status: "empty" },
    { id: "8", status: "occupied", member: { name: "Tsetseg", profession: "Teacher", level: 4 } },
    { id: "9", status: "empty" },
    { id: "10", status: "empty" },
  ];

  const arbanMembers: SeatProps[] = baseArbanMembers.map(seat => ({
    ...seat,
    isSelected: seat.id === selectedSeat
  }));

  // MOCK DATA FOR ZUUN (10) - Representing 10 Leaders
  const zuunMembers: SeatProps[] = Array.from({ length: 10 }, (_, i) => {
    const id = `z-${i}`;
    return {
      id,
      status: (i < 7 ? "occupied" : "empty") as "occupied" | "empty",
      role: (i === 0 ? "leader" : "member") as "leader" | "member",
      member: i < 7 ? { name: `Leader Unit ${i+1}`, profession: "Representative", level: 10 + i } : undefined,
      isSelected: id === selectedSeat
    };
  });

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-3xl font-bold text-white">Khural Assembly</h1>
            <p className="text-zinc-400">Governance Circle • {viewLevel === "arban" ? "Arga-Bilig (Family Unit)" : "Zuun (Community Circle)"}</p>
         </div>
         <div className="flex gap-2">
            <Button 
               variant={viewLevel === "arban" ? "primary" : "secondary"} 
               size="sm"
               onClick={() => setViewLevel("arban")}
            >
               Arban (10)
            </Button>
            <Button 
               variant={viewLevel === "zuun" ? "primary" : "secondary"} 
               size="sm"
               onClick={() => setViewLevel("zuun")}
            >
               Zuun (100)
            </Button>
         </div>
      </div>

      {/* CIRCLE VISUALIZATION */}
      <div className="flex flex-col items-center justify-center min-h-[500px] glass-panel rounded-2xl relative overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-950/80 to-zinc-950 pointer-events-none" />
         
         <CircleLayout 
            className="scale-75 md:scale-100 transition-transform duration-500"
            capacity={10} 
            members={viewLevel === "arban" ? arbanMembers : zuunMembers}
            radius={viewLevel === "arban" ? 180 : 220}
            onSeatClick={(id) => setSelectedSeat(id === selectedSeat ? null : id)}
            centerContent={
               <div className="text-center p-4">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Active Session</div>
                  <div className="text-xl font-bold text-gold-primary mb-2">
                     {viewLevel === "arban" ? "Weekly Council" : "District Vote"}
                  </div>
                  <Button size="sm" variant="secondary" className="border-white/10 text-xs h-7">
                     View Proposal
                  </Button>
               </div>
            }
         />

         {/* Legend / Info */}
         <div className="absolute bottom-6 left-6 text-xs text-zinc-500 space-y-1">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-gold-primary shadow-[0_0_8px_var(--gold-primary)]" />
               <span>Leader / Speaker</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full border border-zinc-500" />
               <span>Member</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full border border-zinc-800 border-dashed" />
               <span>Open Seat</span>
            </div>
         </div>
      </div>

      {/* DETAILS PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-2 glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Current Topics</h3>
            <div className="space-y-3">
               <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-gold-border/30 transition cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                     <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">VOTING ACTIVE</span>
                     <span className="text-xs text-zinc-500">Ends in 2h</span>
                  </div>
                  <h4 className="font-medium text-zinc-200 group-hover:text-white">Ratify monthly budget for communal farm</h4>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                     <div className="h-full bg-emerald-500 w-[60%]" />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-1 uppercase tracking-wide">
                     <span>6 For</span>
                     <span>Total 10 Votes</span>
                  </div>
               </div>
            </div>
         </div>

         <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">My Role</h3>
            <div className="flex items-center gap-4 mb-6">
               <ProfessionBadge profession="Architect" level={5} size="lg" showLabel={false} />
               <div>
                  <div className="font-bold text-white">Observer</div>
                  <div className="text-xs text-zinc-400">Level 5 Architect</div>
               </div>
            </div>
            <div className="space-y-2">
               <Button className="w-full justify-between group" variant="secondary">
                  <span>View Member List</span>
                  <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white" />
               </Button>
               <Button className="w-full justify-between group" variant="secondary">
                  <span>Constitution</span>
                  <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white" />
               </Button>
            </div>
         </div>
      </div>
    </div>
  );
}


