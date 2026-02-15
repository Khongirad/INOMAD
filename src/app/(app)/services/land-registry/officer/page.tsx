'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Map, Mountain, Home, Gavel, Info } from 'lucide-react';

export default function LandRegistryOfficerPage() {
  const router = useRouter();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Панель officer land registry</h1>
        <p className="text-muted-foreground mt-1">
          Approval of registrations, governance transfers и ведение cadastral records
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-2">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold mb-1">Инструменты officer land registry</p>
          <p className="text-sm text-muted-foreground">
            Review and approval registrations land plots, ownership rights, contracts аренды и transfers прав.
            All transactions are recorded on the ALTAN blockchain for immutability.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Map className="h-10 w-10 text-primary" />
              <h3 className="text-lg font-semibold">Cadastral Map</h3>
              <p className="text-sm text-muted-foreground">
                View all registered land plots on interactive GIS map
              </p>
              <Button className="w-full">Open Map</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <Mountain className="h-10 w-10 text-green-500" />
              <h3 className="text-lg font-semibold">Pending участки</h3>
              <p className="text-sm text-muted-foreground">
                Review and approval заявок на регистрацию land plots
              </p>
              <Button variant="outline" className="w-full">Pending (0)</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <Home className="h-10 w-10 text-yellow-500" />
              <h3 className="text-lg font-semibold">Pending property rights</h3>
              <p className="text-sm text-muted-foreground">
                Approval of registrations собственности и citizenship verification
              </p>
              <Button variant="outline" className="w-full">Pending (0)</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <Gavel className="h-10 w-10 text-red-500" />
              <h3 className="text-lg font-semibold">Pending transfers</h3>
              <p className="text-sm text-muted-foreground">
                Review of applications на передачу праin и payment confirmation
              </p>
              <Button variant="outline" className="w-full">Pending (0)</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Records</TabsTrigger>
          <TabsTrigger value="land">Land Plots</TabsTrigger>
          <TabsTrigger value="ownership">Property Rights</TabsTrigger>
          <TabsTrigger value="leases">Lease</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Инструменты officer land registry скоро будут accessны...
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Full cadastral map integration, GIS viewer, and approval workflows will be added in the next update.
            </p>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
