'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronRight,
  ChevronDown,
  Users,
  Shield,
  Crown,
  Handshake,
  ArrowRightLeft,
  Plus,
  TreePine,
  Loader2,
} from 'lucide-react';

// Level colors
const LEVEL_COLORS: Record<string, string> = {
  confederation: 'bg-yellow-500',
  republic: 'bg-blue-500',
  tumen: 'bg-purple-500',
  myangan: 'bg-green-500',
  zun: 'bg-orange-500',
  arban: 'bg-red-500',
};

const LEVEL_BORDER_COLORS: Record<string, string> = {
  confederation: 'border-yellow-500',
  republic: 'border-blue-500',
  tumen: 'border-purple-500',
  myangan: 'border-green-500',
  zun: 'border-orange-500',
  arban: 'border-red-500',
};

const LEVEL_TEXT_COLORS: Record<string, string> = {
  confederation: 'text-yellow-500',
  republic: 'text-blue-500',
  tumen: 'text-purple-500',
  myangan: 'text-green-500',
  zun: 'text-orange-500',
  arban: 'text-red-500',
};

const LEVEL_LABELS: Record<string, string> = {
  confederation: 'Confederation',
  republic: 'Republic',
  tumen: 'Tumen (10 000)',
  myangan: 'Myangan (1 000)',
  zun: 'Zuun (100)',
  arban: 'Arban (10)',
};

// Collapsible tree node
function TreeNode({ level, name, children: childNodes, count, leader, extra }: {
  level: string;
  name: string;
  children?: React.ReactNode;
  count?: number;
  leader?: string;
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(level === 'confederation' || level === 'republic');
  const hasChildren = !!childNodes;

  return (
    <div className={level === 'confederation' ? '' : 'ml-4'}>
      <div
        className={`flex items-center gap-2 p-2 rounded-md ${hasChildren ? 'cursor-pointer' : ''} hover:bg-white/5 border-l-[3px] ${LEVEL_BORDER_COLORS[level] || 'border-gray-500'}`}
        onClick={() => { if (hasChildren) setOpen(!open); }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />
        ) : (
          <div className="w-4" />
        )}

        <Badge className={`${LEVEL_COLORS[level] || 'bg-gray-500'} text-black text-[10px] font-bold h-5`}>
          {LEVEL_LABELS[level] || level}
        </Badge>

        <span className="text-sm font-semibold flex-1">{name}</span>

        {count !== undefined && (
          <Badge variant="outline" className="text-[10px] h-5">{count} members</Badge>
        )}

        {leader && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Crown className="h-3 w-3 text-yellow-500" />
            {leader}
          </span>
        )}

        {extra}
      </div>

      {hasChildren && open && (
        <div className="ml-2">
          {childNodes}
        </div>
      )}
    </div>
  );
}

// Stats card
function StatCard({ label, value, colorClass }: { label: string; value: number | string; colorClass: string }) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function HierarchyPage() {
  const [tree, setTree] = useState<any>(null);
  const [tumens, setTumens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coopDialog, setCoopDialog] = useState(false);
  const [coopForm, setCoopForm] = useState({ targetTumenId: '', title: '', description: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [treeRes, tumensRes] = await Promise.all([
        fetch('/api/hierarchy/tree', { headers }),
        fetch('/api/hierarchy/tumens', { headers }),
      ]);
      if (treeRes.ok) setTree(await treeRes.json());
      if (tumensRes.ok) setTumens(await tumensRes.json());
    } catch (err) {
      console.error('Failed to load hierarchy', err);
    } finally {
      setLoading(false);
    }
  };

  const totalRepublics = tree?.republics?.length || 0;
  const totalTumens = tumens.length;
  const totalMyangans = tumens.reduce((a: number, t: any) => a + (t.memberMyangans?.length || 0), 0);
  const totalCoops = tumens.reduce((a: number, t: any) =>
    a + (t.cooperationsAsA?.length || 0) + (t.cooperationsAsB?.length || 0), 0
  ) / 2;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <TreePine className="h-7 w-7 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-bold">Hierarchy / Hierarchy</h1>
          <p className="text-sm text-muted-foreground">
            Arban(10) → Zuun(100) → Myangan(1000) → Tumen(10 000) → Republic → Confederation
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap mb-6">
        <StatCard label="Republics" value={totalRepublics} colorClass="text-blue-500" />
        <StatCard label="Tumens" value={totalTumens} colorClass="text-purple-500" />
        <StatCard label="Myangans" value={totalMyangans} colorClass="text-green-500" />
        <StatCard label="Cooperations" value={Math.floor(totalCoops)} colorClass="text-orange-500" />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="tree">
        <TabsList className="mb-4">
          <TabsTrigger value="tree">🌳 Hierarchy Tree</TabsTrigger>
          <TabsTrigger value="cooperation">🤝 Tumen Cooperation</TabsTrigger>
        </TabsList>

        {/* Tab: Tree */}
        <TabsContent value="tree">
          <Card className="p-4">
            {tree?.confederation && (
              <TreeNode
                level="confederation"
                name={tree.confederation.name || 'Confederation Khural'}
                count={tree.confederation.totalMembers}
              >
                {tree.republics?.map((republic: any) => (
                  <TreeNode key={republic.id} level="republic" name={republic.name} count={republic.totalMembers}>
                    {republic.memberTumens?.map((tumen: any) => (
                      <TreeNode
                        key={tumen.id}
                        level="tumen"
                        name={tumen.name}
                        count={tumen.totalMembers}
                        extra={
                          (tumen.cooperationsAsA?.length > 0 || tumen.cooperationsAsB?.length > 0) && (
                            <span className="relative inline-flex">
                              <Handshake className="h-3.5 w-3.5 text-orange-500" />
                              <span className="absolute -top-1.5 -right-2 bg-orange-500 text-black text-[9px] rounded-full h-3.5 min-w-[14px] flex items-center justify-center font-bold">
                                {(tumen.cooperationsAsA?.length || 0) + (tumen.cooperationsAsB?.length || 0)}
                              </span>
                            </span>
                          )
                        }
                      >
                        {tumen.memberMyangans?.map((myangan: any) => (
                          <TreeNode key={myangan.id} level="myangan" name={myangan.name} count={myangan.totalMembers}>
                            {myangan.memberZuns?.map((zun: any) => (
                              <TreeNode key={zun.id} level="zun" name={zun.name} count={zun.memberArbans?.length ? zun.memberArbans.length * 10 : 0}>
                                {zun.memberArbans?.map((arban: any) => (
                                  <TreeNode key={arban.id} level="arban" name={`Arban #${arban.arbanId}`} count={10} />
                                ))}
                              </TreeNode>
                            ))}
                          </TreeNode>
                        ))}
                      </TreeNode>
                    ))}
                  </TreeNode>
                ))}
              </TreeNode>
            )}

            {!tree?.confederation && !loading && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm">
                ℹ️ Hierarchy not yet created. Start by creating Arbans and Zuuns.
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab: Cooperation */}
        <TabsContent value="cooperation">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">🤝 Tumen Cooperation</h2>
            <Button onClick={() => setCoopDialog(true)} className="gap-2 bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4" />
              Propose
            </Button>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm mb-4">
            <strong>Tumens do not merge</strong> — they can only cooperate.
            Each Tumen remains a sovereign unit с собственным leaderом и governanceм.
          </div>

          {tumens.map((tumen: any) => {
            const allCoops = [
              ...(tumen.cooperationsAsA || []).map((c: any) => ({ ...c, partner: c.tumenB, direction: 'outgoing' })),
              ...(tumen.cooperationsAsB || []).map((c: any) => ({ ...c, partner: c.tumenA, direction: 'incoming' })),
            ];
            if (allCoops.length === 0) return null;

            return (
              <Card key={tumen.id} className="mb-3">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    <span className="font-semibold">{tumen.name}</span>
                    <Badge variant="outline" className="text-[10px] h-5">{tumen.region}</Badge>
                  </div>

                  <div className="border-t border-border my-2" />

                  {allCoops.map((coop: any) => (
                    <div key={coop.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 mb-1">
                      <ArrowRightLeft className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      <span className="text-sm flex-1">↔ {coop.partner?.name || 'Unknown'}</span>
                      <Badge variant="outline" className="text-[10px] h-[18px]">{coop.title}</Badge>
                      <Badge className={`text-[10px] h-[18px] ${
                        coop.status === 'ACTIVE' ? 'bg-green-600' : coop.status === 'PROPOSED' ? 'bg-yellow-600' : 'bg-gray-600'
                      }`}>{coop.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {tumens.every((t: any) => (t.cooperationsAsA?.length || 0) + (t.cooperationsAsB?.length || 0) === 0) && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm">
              ℹ️ Not yet actивных cooperations between Tumenами.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cooperation Dialog */}
      <Dialog open={coopDialog} onOpenChange={setCoopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose cooperation</DialogTitle>
            <DialogDescription>
              Cooperation — это an agreement between two Tumenами. Tumens remain independent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ID целевого Tumenа</Label>
              <Input
                value={coopForm.targetTumenId}
                onChange={e => setCoopForm({ ...coopForm, targetTumenId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Title соглашения</Label>
              <Input
                value={coopForm.title}
                onChange={e => setCoopForm({ ...coopForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                value={coopForm.description}
                onChange={e => setCoopForm({ ...coopForm, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCoopDialog(false)}>Cancel</Button>
            <Button className="bg-purple-600 hover:bg-purple-700">Propose</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
