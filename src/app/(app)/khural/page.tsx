'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CircleLayout } from '@/components/visual/circle-layout';
import { ChevronUp, Users, Map as MapIcon, ZoomIn } from 'lucide-react';

// Mock Data for Visualization
type SeatRole = 'member' | 'leader' | 'elder';
type SeatStatus = 'empty' | 'occupied' | 'locked';

const MOCK_ARBAN: Array<{ id: string; status: SeatStatus; member: { name: string }; role: SeatRole }> = Array(10).fill(null).map((_, i) => ({
  id: `s-${i}`,
  status: 'occupied',
  member: { name: `Citizen ${i+1}` },
  role: i === 0 ? 'leader' : 'member'
}));
const MOCK_ZUUN_LEADERS: Array<{ id: string; status: SeatStatus; member: { name: string }; role: SeatRole }> = Array(10).fill(null).map((_, i) => ({
  id: `z-${i}`,
  status: 'occupied',
  member: { name: `Arban Leader ${i+1}` },
  role: 'leader'
}));

export default function KhuralMapPage() {
  const [level, setLevel] = useState<'TUMEN' | 'MYANGAN' | 'ZUUN' | 'ARBAN'>('TUMEN');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const renderLevelInfo = () => {
    switch(level) {
      case 'TUMEN': return { title: 'State (Tümèn)', count: '10,000', next: 'MYANGAN' };
      case 'MYANGAN': return { title: 'District (Myangan)', count: '1,000', next: 'ZUUN' };
      case 'ZUUN': return { title: 'Community (Zuun)', count: '100', next: 'ARBAN' };
      case 'ARBAN': return { title: 'Family Unit (Arban)', count: '10', next: null };
    }
  };

  const info = renderLevelInfo();

  const handleZoomIn = () => {
    if (info.next) setLevel(info.next as any);
  };

  const handleZoomOut = () => {
    if (level === 'ARBAN') setLevel('ZUUN');
    else if (level === 'ZUUN') setLevel('MYANGAN');
    else if (level === 'MYANGAN') setLevel('TUMEN');
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col relative overflow-hidden">
      
      {/* HUD Header */}
      <div className="absolute top-4 left-4 z-20">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
          <MapIcon className="w-8 h-8 text-amber-500" />
          The Khural Map
        </h1>
        <p className="text-zinc-400 mt-1">Fractal Governance Interface</p>
      </div>

      {/* Navigation Controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
         <Button 
           variant="outline" 
           disabled={level === 'TUMEN'}
           onClick={handleZoomOut}
           className="bg-black/40 backdrop-blur border-zinc-700"
         >
           <ChevronUp className="w-4 h-4 mr-2" /> Zoom Out
         </Button>
      </div>

      {/* Main Visualization Area */}
      <div className="flex-1 flex items-center justify-center relative bg-[url('/grid-pattern.svg')] bg-center opacity-80">
         {/* Background Ambience */}
         <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950/90 to-black pointer-events-none" />
         
         <div className="relative z-10 scale-100 transition-all duration-700 ease-in-out">
            <div className="text-center mb-8">
               <h2 className="text-4xl font-light text-amber-500 tracking-[0.2em] uppercase mb-2">{info.title}</h2>
               <div className="flex items-center justify-center gap-2 text-zinc-500">
                 <Users className="w-4 h-4" />
                 <span>Population: {info.count}</span>
               </div>
            </div>

            <div className="relative group cursor-pointer" onClick={handleZoomIn}>
               {/* The Circle */}
               <CircleLayout 
                 capacity={10} 
                 members={level === 'ARBAN' ? MOCK_ARBAN : MOCK_ZUUN_LEADERS} // Show Leaders of sub-groups normally
                 radius={200}
                 centerContent={
                   <div className="w-32 h-32 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center backdrop-blur-md group-hover:bg-amber-500/20 transition-all">
                      <ZoomIn className="w-8 h-8 text-amber-500 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                   </div>
                 }
               />
               
               {/* Orbital Rings Effect */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-zinc-800 rounded-full opacity-20 pointer-events-none animate-spin-slow" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-dashed border-zinc-800 rounded-full opacity-10 pointer-events-none" />
            </div>
         </div>
      </div>
      
      {/* Context Panel */}
      <Card className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl bg-zinc-950/80 backdrop-blur border-zinc-800 p-6 text-center">
         <p className="text-zinc-400 text-sm">
           Viewing level <strong className="text-white">{info.title}</strong>. 
           {info.next ? " Click center to drill down to constituent units." : " Lowest level reached (Family Unit)."}
         </p>
      </Card>

    </div>
  );
}
