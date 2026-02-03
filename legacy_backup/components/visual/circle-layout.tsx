"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Seat, SeatProps } from "@/components/community/seat";

interface CircleLayoutProps {
  capacity: number; // e.g. 10 or 100
  members: Array<SeatProps>; // The data to populate seats
  radius?: number; // Optional override
  className?: string;
  centerContent?: React.ReactNode;
  onSeatClick?: (id: string) => void;
}

export function CircleLayout({
  capacity = 10,
  members,
  radius = 140, // Default radius suitable for ~10 items
  className,
  centerContent,
  onSeatClick,
}: CircleLayoutProps) {
  
  // Create an array of length `capacity`
  // We map over this to generate positions
  const seats = Array.from({ length: capacity }, (_, i) => {
    // Check if we have a member for this slot
    // Assuming members might not be full, or might need specific slotting
    // Here we just map linearly 0..N
    const memberData = members[i] || null;
    
    // Position Calculation:
    // Start from -90deg (top center)
    // Angle per seat = 360 / capacity
    const angleDeg = (360 / capacity) * i - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    
    const x = Math.cos(angleRad) * radius;
    const y = Math.sin(angleRad) * radius;

    return {
      idx: i,
      x: x.toFixed(2), // Keep CSS clean
      y: y.toFixed(2),
      member: memberData,
    };
  });

  return (
    <div 
      className={cn("relative flex items-center justify-center p-20", className)}
      style={{ width: radius * 2 + 100, height: radius * 2 + 100 }} // Explicit sizing container
    >
      {/* CENTER HEARTH */}
      <div className="absolute z-10 flex items-center justify-center">
        {centerContent || (
           <div className="h-24 w-24 rounded-full bg-zinc-900/50 border border-white/5 backdrop-blur-sm flex items-center justify-center">
             <div className="h-2 w-2 rounded-full bg-gold-primary animate-pulse shadow-[0_0_10px_var(--gold-glow)]" />
           </div>
        )}
      </div>

      {/* RINGS (DECORATIVE BACKGROUND) */}
      <div 
         className="absolute rounded-full border border-white/5 pointer-events-none"
         style={{ width: radius * 2, height: radius * 2 }}
      />
      <div 
         className="absolute rounded-full border border-dashed border-white/5 pointer-events-none opacity-50"
         style={{ width: radius * 2 + 30, height: radius * 2 + 30 }}
      />

      {/* SEATS */}
      {seats.map((seat) => (
        <Seat
          key={seat.idx}
          id={seat.member?.id || `empty-${seat.idx}`}
          status={seat.member ? "occupied" : "empty"}
          role={seat.member?.role || "member"}
          vote={seat.member?.vote}
          member={seat.member?.member}
          className="absolute"
          style={{
             transform: `translate(${seat.x}px, ${seat.y}px)`,
          }}
          onClick={() => onSeatClick && onSeatClick(seat.member?.id || `empty-${seat.idx}`)}
        />
      ))}
    </div>
  );
}
