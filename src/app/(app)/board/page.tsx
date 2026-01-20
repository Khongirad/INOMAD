'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/components/work/create-task-dialog';
import { Briefcase, Coins, Timer } from 'lucide-react';
import { api } from '@/lib/api';

interface Task {
  id: string;
  title: string;
  description: string;
  rewardAltan: number;
  status: 'OPEN' | 'TAKEN' | 'COMPLETED' | 'CANCELLED';
  profession?: { id: string; name: string } | null;
  createdBy?: { id: string; seatId: string };
}

export default function BoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const data = await api.get<Task[]>('/tasks');
      setTasks(data);
    } catch (err) {
      console.warn('Using mock tasks:', err);
      // Fallback mock data
      setTasks([
        {
          id: '1',
          title: 'Repair North Watchtower',
          description: 'The watchtower needs structural repairs after the storm.',
          rewardAltan: 500,
          status: 'OPEN',
          profession: { id: 'arch', name: 'Architects' },
        },
        {
          id: '2',
          title: 'Draft Trade Agreement',
          description: 'Prepare legal documents for the merchant guild treaty.',
          rewardAltan: 300,
          status: 'OPEN',
          profession: { id: 'scribe', name: 'Scribes' },
        },
        {
          id: '3',
          title: 'Guard Caravan Route',
          description: 'Escort merchants through the mountain pass.',
          rewardAltan: 750,
          status: 'TAKEN',
          profession: { id: 'guard', name: 'Guards' },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleClaim = async (taskId: string) => {
    try {
      await api.post(`/tasks/${taskId}/accept`);
      fetchTasks();
    } catch (err) {
      console.error('Failed to claim task:', err);
      alert('Failed to claim task. Backend may be offline.');
    }
  };

  const refreshTasks = () => {
    fetchTasks();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

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
                 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs border border-zinc-700 text-zinc-400 mb-2">
                   {task.profession.name} Guild
                 </span>
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
