"use client";

import Link from "next/link";
import { User, Building2, Landmark, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-950/80 to-zinc-950 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

      {/* Hero Content */}
      <div className="relative z-10 max-w-5xl w-full text-center space-y-8 animate-in mt-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-border/30 bg-gold-surface px-3 py-1 text-xs font-medium tracking-widest text-gold-primary uppercase shadow-[0_0_15px_-5px_var(--gold-glow)]">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-primary animate-pulse" />
            Sovereign Operating System
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white">
            INOMAD <span className="text-zinc-500">KHURAL</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-400 leading-relaxed md:text-xl">
            A state-grade digital governance platform.
            <br className="hidden md:block" />
            Manage identity, assets, and civic duty with institutional precision.
          </p>
        </div>

        {/* Pillars / Entry Points */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 px-4">
          <EntryCard
            title="Citizen"
            subtitle="Personal Identity"
            icon={User}
            href="/dashboard" /* Flow usually goes to login first, but dashboard handles auth check or mock for now */
            delay="0s"
          />
          <EntryCard
            title="Organization"
            subtitle="Business & Guilds"
            icon={Building2}
            href="/dashboard"
            delay="0.1s"
          />
          <EntryCard
            title="Government"
            subtitle="Official Access"
            icon={Landmark}
            href="/dashboard"
            delay="0.2s"
          />
        </div>

        <div className="pt-20 text-xs text-zinc-600 font-mono">
          SECURED BY ALTAN CHAIN • v2.0.4 STATE-GRADE
        </div>
      </div>
    </div>
  );
}

function EntryCard({
  title,
  subtitle,
  icon: Icon,
  href,
  delay,
}: {
  title: string;
  subtitle: string;
  icon: any;
  href: string;
  delay: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-zinc-900/40 p-10 text-center transition-all duration-300",
        "hover:border-gold-border/50 hover:bg-zinc-900/80 hover:-translate-y-1 hover:shadow-2xl hover:shadow-gold-glow/10"
      )}
      style={{ animationDelay: delay }}
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-zinc-400 ring-1 ring-white/10 transition-all duration-300 group-hover:bg-gold-surface group-hover:text-gold-primary group-hover:ring-gold-border">
        <Icon className="h-8 w-8" />
      </div>
      
      <h3 className="text-xl font-bold text-zinc-100 group-hover:text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm text-zinc-500 group-hover:text-zinc-400">
        {subtitle}
      </p>

      <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-600 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:text-gold-primary">
        Enter System <ArrowRight className="h-3 w-3" />
      </div>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 h-8 w-px bg-gradient-to-b from-white/20 to-transparent group-hover:from-gold-border" />
      <div className="absolute top-0 left-0 h-px w-8 bg-gradient-to-r from-white/20 to-transparent group-hover:from-gold-border" />
      <div className="absolute bottom-0 right-0 h-8 w-px bg-gradient-to-t from-white/20 to-transparent group-hover:from-gold-border" />
      <div className="absolute bottom-0 right-0 h-px w-8 bg-gradient-to-l from-white/20 to-transparent group-hover:from-gold-border" />
    </Link>
  );
}
