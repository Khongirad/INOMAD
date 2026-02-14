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
        <h1 className="text-3xl font-bold">Панель офицера земельного реестра</h1>
        <p className="text-muted-foreground mt-1">
          Утверждение регистраций, управление переводами и ведение кадастровых записей
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-2">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold mb-1">Инструменты офицера земельного реестра</p>
          <p className="text-sm text-muted-foreground">
            Рассмотрение и утверждение регистраций земельных участков, прав собственности, договоров аренды и передачи прав.
            Все транзакции записываются в блокчейн ALTAN для неизменяемости.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Быстрые действия</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Map className="h-10 w-10 text-primary" />
              <h3 className="text-lg font-semibold">Кадастровая карта</h3>
              <p className="text-sm text-muted-foreground">
                Просмотр всех зарегистрированных земельных участков на интерактивной ГИС-карте
              </p>
              <Button className="w-full">Открыть карту</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <Mountain className="h-10 w-10 text-green-500" />
              <h3 className="text-lg font-semibold">Ожидающие участки</h3>
              <p className="text-sm text-muted-foreground">
                Рассмотрение и утверждение заявок на регистрацию земельных участков
              </p>
              <Button variant="outline" className="w-full">Ожидающие (0)</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <Home className="h-10 w-10 text-yellow-500" />
              <h3 className="text-lg font-semibold">Ожидающие права собственности</h3>
              <p className="text-sm text-muted-foreground">
                Утверждение регистраций собственности и проверка гражданства
              </p>
              <Button variant="outline" className="w-full">Ожидающие (0)</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <Gavel className="h-10 w-10 text-red-500" />
              <h3 className="text-lg font-semibold">Ожидающие передачи</h3>
              <p className="text-sm text-muted-foreground">
                Рассмотрение заявок на передачу прав и подтверждение оплаты
              </p>
              <Button variant="outline" className="w-full">Ожидающие (0)</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Все записи</TabsTrigger>
          <TabsTrigger value="land">Земельные участки</TabsTrigger>
          <TabsTrigger value="ownership">Права собственности</TabsTrigger>
          <TabsTrigger value="leases">Аренда</TabsTrigger>
          <TabsTrigger value="transfers">Передачи</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Инструменты офицера земельного реестра скоро будут доступны...
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Полная интеграция кадастровой карты, просмотрщик ГИС и рабочие процессы утверждения будут добавлены в следующем обновлении.
            </p>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
