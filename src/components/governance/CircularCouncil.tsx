"use client";

/**
 * CircularCouncil - Main circular governance visualization
 * 
 * Displays all council members arranged in a perfect circle around
 * the sacred Tengri symbol. Implements the democratic principle that
 * all members are equal - no visual hierarchy by position.
 * 
 * Features:
 * - Responsive sizing (mobile to desktop)
 * - Color-coded by governance level
 * - Click handlers for member interaction
 * - Optional leader panel overlay
 */

import React, { useState } from 'react';
import { TengriSymbol } from './TengriSymbol';
import { MemberSeat, type Member } from './MemberSeat';
import { type GovernanceLevel, getLevelConfig } from '@/lib/governance-levels';
import { cn } from '@/lib/utils';

interface CircularCouncilProps {
  level: GovernanceLevel;
  members: Member[];
  onMemberClick?: (member: Member) => void;
  showLeaderPanel?: boolean;
  className?: string;
}

export function CircularCouncil({
  level,
  members,
  onMemberClick,
  showLeaderPanel = false,
  className = '',
}: CircularCouncilProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const levelConfig = getLevelConfig(level);

  // Calculate circle dimensions based on member count
  const memberCount = members.length || 10;
  const baseRadius = 200; // Base radius for 10 members
  const radius = memberCount > 10 ? baseRadius + (memberCount - 10) * 5 : baseRadius;
  
  // SVG container size (needs to fit circle + member seats)
  const containerSize = (radius + 100) * 2;

  // Calculate angular spacing
  const angleStep = 360 / memberCount;
  // Start at top (-90°) so first member is at 12 o'clock
  const startAngle = -90;

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    onMemberClick?.(member);
  };

  return (
    <div className={cn("relative w-full flex flex-col items-center", className)}>
      {/* Level Badge */}
      <div
        className="mb-6 px-4 py-2 rounded-full border-2 font-semibold uppercase tracking-wider text-sm"
        style={{
          borderColor: levelConfig.borderColor,
          color: levelConfig.textColor,
          backgroundColor: `${levelConfig.color}20`,
          boxShadow: `0 0 15px ${levelConfig.glowColor}`,
        }}
      >
        {levelConfig.name} Council
      </div>

      {/* Circular Council Container */}
      <div
        className="relative"
        style={{
          width: `${containerSize}px`,
          height: `${containerSize}px`,
        }}
      >
        {/* Central Tengri Symbol */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <TengriSymbol size={160} />
        </div>

        {/* Member Seats */}
        {members.map((member, index) => {
          const angle = startAngle + (index * angleStep);
          return (
            <MemberSeat
              key={member.id}
              member={member}
              angle={angle}
              radius={radius}
              levelColor={levelConfig.color}
              onClick={() => handleMemberClick(member)}
            />
          );
        })}

        {/* Circle Guide (subtle) */}
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed opacity-10"
          style={{
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
            borderColor: levelConfig.color,
          }}
        />
      </div>

      {/* Member Count Info */}
      <div className="mt-6 text-center">
        <p className="text-zinc-400 text-sm">
          {members.filter(m => m.hasSigned).length} / {memberCount} signed
        </p>
        {selectedMember && (
          <p className="text-zinc-500 text-xs mt-1">
            Selected: {selectedMember.name}
          </p>
        )}
      </div>

      {/* Leader Panel Placeholder */}
      {showLeaderPanel && (
        <div
          className="mt-8 w-full max-w-md p-6 rounded-xl border-2"
          style={{
            borderColor: levelConfig.borderColor,
            backgroundColor: `${levelConfig.color}10`,
          }}
        >
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: levelConfig.textColor }}
          >
            Leader Panel
          </h3>
          <p className="text-zinc-400 text-sm">
            Control panel for council leader actions (submit proposals, delegate, etc.)
          </p>
        </div>
      )}
    </div>
  );
}
