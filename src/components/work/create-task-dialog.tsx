'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface CreateTaskDialogProps {
  children: React.ReactNode;
  onTaskCreated: () => void;
}

export function CreateTaskDialog({ children, onTaskCreated }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rewardAltan: '',
    professionId: '' // In real app, this would be a dropdown of available Professions
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // In a real scenario, we'd fetch actual Guild IDs
      // For MVP, we send string names if backend supports it, or mock IDs
      await api.post('tasks', {
        title: formData.title,
        description: formData.description,
        rewardAltan: Number(formData.rewardAltan),
        professionId: formData.professionId || undefined
      });
      
      setOpen(false);
      onTaskCreated();
      setFormData({ title: '', description: '', rewardAltan: '', professionId: '' });
    } catch (error) {
      console.error('Failed to create task:', error);
      // Fallback for demo when backend is down
      alert("Backend offline: Task creation simulated.");
      onTaskCreated(); // Trigger refresh anyway
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            Post New Contract
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Contract Title</Label>
            <Input 
              id="title" 
              placeholder="e.g., Repair North Watchtower" 
              className="bg-zinc-900 border-zinc-700 focus:border-amber-500"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea 
              id="desc" 
              placeholder="Detailed requirements..." 
              className="bg-zinc-900 border-zinc-700 focus:border-amber-500 min-h-[100px]"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reward">Reward (ALT)</Label>
              <Input 
                id="reward" 
                type="number" 
                placeholder="500" 
                className="bg-zinc-900 border-zinc-700 focus:border-amber-500 font-mono text-amber-400"
                value={formData.rewardAltan}
                onChange={(e) => setFormData({...formData, rewardAltan: e.target.value})}
                required
                min="1"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Target Guild</Label>
              <Select 
                 value={formData.professionId} 
                 onValueChange={(val) => setFormData({...formData, professionId: val})}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                  <SelectValue placeholder="Any / General" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="architect">Architects</SelectItem>
                  <SelectItem value="scribe">Scribes</SelectItem>
                  <SelectItem value="engineer">Engineers</SelectItem>
                  <SelectItem value="guard">Guards</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
             <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
             <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[100px]">
               {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Contract"}
             </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
