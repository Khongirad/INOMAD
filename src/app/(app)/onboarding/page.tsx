"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Sword, Shield, Wallet, Users, Scroll, Lock,
  ChevronRight, Star, Sparkles, Trophy, CheckCircle2,
  Circle, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getOnboardingProgress,
  getOnboardingSteps,
  completeOnboardingStep,
} from "@/lib/api/onboarding";

// Step icon mapping
const STEP_ICONS: Record<string, React.ElementType> = {
  setup_wallet: Wallet,
  verify_identity: Shield,
  join_guild: Users,
  join_arbad: Sword,
  first_vote: Scroll,
  constitution: Lock,
};

const STEP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  setup_wallet: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30" },
  verify_identity: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
  join_guild: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30" },
  join_arbad: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
  first_vote: { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/30" },
  constitution: { bg: "bg-cyan-500/10", text: "text-cyan-500", border: "border-cyan-500/30" },
};

const DEFAULT_COLORS = { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/30" };

interface StepDef {
  key: string;
  title: string;
  description: string;
  xpReward: number;
  order: number;
}

interface Progress {
  completedSteps: string[];
  totalXpEarned: number;
  isComplete: boolean;
}

export default function OnboardingPage() {
  const [steps, setSteps] = useState<StepDef[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [stepsData, progressData] = await Promise.all([
        getOnboardingSteps(),
        getOnboardingProgress(),
      ]);
      setSteps(Array.isArray(stepsData) ? stepsData : []);
      setProgress(progressData);
    } catch (err) {
      console.error("Failed to load onboarding data:", err);
      // If backend endpoints aren't available, show demo steps
      setSteps([
        { key: "setup_wallet", title: "Set Up Wallet", description: "Create your MPC wallet for financial sovereignty", xpReward: 50, order: 0 },
        { key: "verify_identity", title: "Verify Identity", description: "Get verified by a fellow citizen", xpReward: 100, order: 1 },
        { key: "join_guild", title: "Join a Guild", description: "Find your professional guild and contribute", xpReward: 75, order: 2 },
        { key: "join_arbad", title: "Join an Arbad", description: "Connect with your local community group", xpReward: 75, order: 3 },
        { key: "first_vote", title: "Cast First Vote", description: "Participate in governance for the first time", xpReward: 100, order: 4 },
        { key: "constitution", title: "Study Constitution", description: "Learn the founding principles of INOMAD KHURAL", xpReward: 50, order: 5 },
      ]);
      setProgress({ completedSteps: [], totalXpEarned: 0, isComplete: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleComplete = async (stepKey: string) => {
    setCompleting(stepKey);
    try {
      await completeOnboardingStep(stepKey);
      toast.success("Step completed! XP awarded 🎉");
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete step");
    } finally {
      setCompleting(null);
    }
  };

  const completedCount = progress?.completedSteps?.length || 0;
  const totalSteps = steps.length || 6;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const totalXP = progress?.totalXpEarned || 0;
  const maxXP = steps.reduce((sum, s) => sum + s.xpReward, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading quest board...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
        </div>

        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-400 font-medium">Citizen Quest Board</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            The Path of the Citizen
          </h1>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Complete quests to earn XP and unlock your full citizenship rights.
            Each step brings you closer to sovereign participation.
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Progress</p>
                  <p className="text-lg font-semibold text-white">
                    {completedCount} / {totalSteps} Quests
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-400">XP Earned</p>
                <p className="text-lg font-semibold text-amber-400">
                  {totalXP} / {maxXP} XP
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {progress?.isComplete && (
              <div className="mt-4 flex items-center gap-2 text-emerald-400">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">
                  All quests completed! You are a fully onboarded citizen. 🎊
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quest Steps */}
        <div className="space-y-3">
          {steps
            .sort((a, b) => a.order - b.order)
            .map((step) => {
              const isCompleted = progress?.completedSteps?.includes(step.key);
              const isActive = completing === step.key;
              const colors = STEP_COLORS[step.key] || DEFAULT_COLORS;
              const Icon = STEP_ICONS[step.key] || Circle;

              return (
                <Card
                  key={step.key}
                  className={cn(
                    "bg-zinc-900/50 border transition-all duration-300",
                    isCompleted
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : `border-zinc-800 hover:${colors.border}`,
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div
                        className={cn(
                          "p-3 rounded-xl shrink-0",
                          isCompleted ? "bg-emerald-500/10" : colors.bg,
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        ) : (
                          <Icon className={cn("h-6 w-6", colors.text)} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className={cn(
                              "font-semibold",
                              isCompleted ? "text-emerald-400" : "text-white",
                            )}
                          >
                            {step.title}
                          </h3>
                          {isCompleted && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 mt-0.5">
                          {step.description}
                        </p>
                      </div>

                      {/* XP and Action */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-zinc-500">Reward</p>
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              isCompleted ? "text-emerald-400" : "text-amber-400",
                            )}
                          >
                            +{step.xpReward} XP
                          </p>
                        </div>
                        {!isCompleted && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={cn(
                              "border-zinc-700 hover:bg-zinc-800",
                              isActive && "opacity-50 cursor-not-allowed",
                            )}
                            disabled={isActive}
                            onClick={() => handleComplete(step.key)}
                          >
                            {isActive ? (
                              <span className="animate-spin h-4 w-4 border-2 border-zinc-400 border-t-transparent rounded-full" />
                            ) : (
                              <>
                                Start <ChevronRight className="h-3 w-3 ml-1" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

      </div>
    </div>
  );
}
