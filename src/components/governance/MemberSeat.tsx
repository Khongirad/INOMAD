"use client";

/**
 * MemberSeat - Individual seat in circular council
 * 
 * Displays a member's avatar, name, and status within the circular layout.
 * Shows visual indicators for:
 * - Active/idle state (glow effect)
 * - Signed/unsigned status (seal icon)
 * - Leader designation (optional crown icon)
 */

import React from 'react';
import { User, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Member {
  id: number;
  name: string;
  avatar?: string;
  isActive?: boolean;
  hasSigned?: boolean;
  isLeader?: boolean;
}

interface MemberSeatProps {
  member: Member;
  angle: number;  // Position angle in degrees
  radius: number; // Distance from center
  levelColor: string;
  onClick?: () => void;
}

export function MemberSeat({
  member,
  angle,
  radius,
  levelColor,
  onClick,
}: MemberSeatProps) {
  // Calculate position
  const x = Math.cos((angle * Math.PI) / 180) * radius;
  const y = Math.sin((angle * Math.PI) / 180) * radius;

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
      }}
      onClick={onClick}
    >
      {/* Seat Container */}
      <div
        className={cn(
          "relative w-16 h-16 rounded-full transition-all duration-300",
          "border-2 flex items-center justify-center",
          member.isActive && "ring-4 ring-offset-2 ring-offset-zinc-950",
        )}
        style={{
          borderColor: levelColor,
          boxShadow: member.isActive
            ? `0 0 20px ${levelColor}80`
            : `0 0 10px ${levelColor}40`,
        }}
      >
        {/* Avatar or Icon */}
        {member.avatar ? (
          <img
            src={member.avatar}
            alt={member.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center"
            style={{ backgroundColor: `${levelColor}20` }}
          >
            <User size={28} style={{ color: levelColor }} />
          </div>
        )}

        {/* Signed Indicator */}
        {member.hasSigned && (
          <div
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: levelColor,
              boxShadow: `0 0 10px ${levelColor}`,
            }}
          >
            <Check size={14} className="text-zinc-900" />
          </div>
        )}

        {/* Leader Crown (optional) */}
        {member.isLeader && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="text-gold-primary text-xl">👑</div>
          </div>
        )}
      </div>

      {/* Name Tooltip */}
      <div
        className={cn(
          "absolute top-full mt-2 left-1/2 transform -translate-x-1/2",
          "bg-zinc-900 border px-3 py-1 rounded-lg text-xs whitespace-nowrap",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "pointer-events-none z-10"
        )}
        style={{
          borderColor: levelColor,
          color: levelColor,
        }}
      >
        {member.name}
        {member.isLeader && <span className="ml-1 text-gold-primary">(Leader)</span>}
      </div>
    </div>
  );
}
