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
        <h1 className="text-3xl font-bold">Панель officerа земельного registryа</h1>
        <p className="text-muted-foreground mt-1">
          Утверждение регистраций, governance transferами и ведение кадастровых записей
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-2">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold mb-1">Инструменты officerа земельного registryа</p>
          <p className="text-sm text-muted-foreground">
            Рассмотрение и утверждение регистраций земельных участков, прав собственности, contractов аренды и передачи прав.
            All транзакции записываются в блокчейн ALTAN for неизменяемости.
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
              <h3 className="text-lg font-semibold">Кадастровая map</h3>
              <p className="text-sm text-muted-foreground">
                Просмотр всех registeredных земельных участков на интерактивной ГИС-карте
              </p>
              <Button className="w-full">Открыть карту</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <Mountain className="h-10 w-10 text-green-500" />
              <h3 className="text-lg font-semibold">Pending участки</h3>
              <p className="text-sm text-muted-foreground">
                Рассмотрение и утверждение заявок на регистрацию земельных участков
              </p>
              <Button variant="outline" className="w-full">Pending (0)</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <Home className="h-10 w-10 text-yellow-500" />
              <h3 className="text-lg font-semibold">Pending права собственности</h3>
              <p className="text-sm text-muted-foreground">
                Утверждение регистраций собственности и verification citizensства
              </p>
              <Button variant="outline" className="w-full">Pending (0)</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <Gavel className="h-10 w-10 text-red-500" />
              <h3 className="text-lg font-semibold">Pending передачи</h3>
              <p className="text-sm text-muted-foreground">
                Рассмотрение заявок на передачу прав и confirmation оплаты
              </p>
              <Button variant="outline" className="w-full">Pending (0)</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All записи</TabsTrigger>
          <TabsTrigger value="land">Landые участки</TabsTrigger>
          <TabsTrigger value="ownership">Права собственности</TabsTrigger>
          <TabsTrigger value="leases">Lease</TabsTrigger>
          <TabsTrigger value="transfers">Передачи</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Инструменты officerа земельного registryа скоро будут accessны...
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Genderная интеграция кадастровой карты, просмотрщик ГИС и рабочие processы утверждения будут добавлены в следующем обновлении.
            </p>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
