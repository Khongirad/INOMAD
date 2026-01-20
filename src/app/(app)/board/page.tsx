'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/components/work/create-task-dialog';

// ... (in component)

// Refresh function for the dialog callback
const refreshTasks = () => {
  // In real app: fetchTasks()
  // For mock: just add a new mock item locally or re-fetch
  alert("Contract List Refreshed (Mock)");
};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-amber-500" />
            Contracts Board
          </h1>
          <p className="text-zinc-400 mt-1">Marketplace for Guild Tasks and Opportunities.</p>
        </div>
        <CreateTaskDialog onTaskCreated={refreshTasks}>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            Post Contract (+ Fee)
          </Button>
        </CreateTaskDialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task) => (
          <Card key={task.id} className="group relative p-6 bg-zinc-900/50 border-zinc-800 hover:border-amber-500/50 transition-all overflow-hidden">
             
             {/* Reward Tag */}
             <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-1 bg-amber-950/40 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20 shadow-lg">
                  <Coins className="w-4 h-4" />
                  <span className="font-mono font-bold">{task.rewardAltan} ALT</span>
                </div>
             </div>

             <div className="mt-2 mb-4">
               {task.profession && (
                 <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400 mb-2">
                   {task.profession.name} Guild
                 </Badge>
               )}
               <h3 className="text-xl font-bold text-zinc-100 group-hover:text-amber-500 transition-colors">
                 {task.title}
               </h3>
             </div>
             
             <p className="text-zinc-400 text-sm line-clamp-3 mb-6 min-h-[60px]">
               {task.description}
             </p>

             <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
               <div className="flex items-center gap-2 text-xs text-zinc-500">
                 <Timer className="w-4 h-4" />
                 <span>2 days left</span>
               </div>
               
               {task.status === 'OPEN' ? (
                 <Button onClick={() => handleClaim(task.id)} className="bg-zinc-100 text-zinc-900 hover:bg-amber-500 hover:text-white transition-colors">
                   Sign Contract
                 </Button>
               ) : (
                 <Button disabled className="bg-zinc-800 text-zinc-500 border border-zinc-700">
                   {task.status}
                 </Button>
               )}
             </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
