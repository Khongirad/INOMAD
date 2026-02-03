"use client";

import * as React from "react";
import { Shield, Wallet, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";

export default function DashboardPage() {
  const { user } = useAuth();
  
  // DEMO OVERRIDE: If user has a wallet, consider them verified to show the full dashboard functions
  const isVerified = user?.status === 'VERIFIED' || user?.walletStatus === 'ACTIVE' || true; // Force true for demo flow as requested

  return (
    <div className="container py-8 space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
            Command Center
        </h1>
        {isVerified && (
           <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-mono uppercase tracking-widest">
              Verified Citizen
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Wallet Card - Always Accessible */}
        <Link href="/wallet">
            <Card className="hover:border-gold-primary transition-colors cursor-pointer bg-zinc-900/50 border-white/10 h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-gold-primary" />
                    Sovereign Wallet
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-zinc-400 text-sm">
                    Manage your MPC-secured assets, view shares, and sign transactions.
                </p>
                <Button className="w-full mt-4" variant="outline">
                    Open Wallet
                </Button>
            </CardContent>
            </Card>
        </Link>
        
        {/* Conditional Branches */}
        {isVerified ? (
            <>
                <Card className="bg-zinc-900/30 border-white/5 opacity-70">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-zinc-500">
                            <Shield className="w-5 h-5" />
                            Governance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-zinc-500 text-sm">
                            Access your Khural Representative duties and voting.
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-white/5 opacity-70">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-zinc-500">
                            <AlertOctagon className="w-5 h-5" />
                            Enforcement
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-zinc-500 text-sm">
                            Civil enforcement and dispute resolution module.
                        </p>
                    </CardContent>
                </Card>
            </>
        ) : (
             <Card className="bg-gold-surface/5 border-gold-border/30 col-span-1 md:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gold-primary">
                        <Shield className="w-5 h-5" />
                        Verification Required
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-zinc-400 text-sm mb-4">
                        Access to Governance, Organization, and Enforcement branches requires full citizen verification.
                    </p>
                    <Button variant="secondary" className="bg-gold-primary/10 text-gold-primary hover:bg-gold-primary/20 border-gold-primary/20">
                        Complete Verification
                    </Button>
                </CardContent>
            </Card>
        )}

      </div>
    </div>
  );
}
