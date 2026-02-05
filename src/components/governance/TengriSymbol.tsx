"use client";

/**
 * TengriSymbol - Sacred Fire-Sun-Moon Symbol
 * 
 * Official Tengri symbol representing the ancient sky worship:
 * - Fire flames at top (eternal flame of knowledge)
 * - Sun circle in middle (day, enlightenment, wisdom)
 * - Moon crescent at bottom (night, mystery, cycles)
 * - Circle of dots (unity, eternity, the people)
 * 
 * Based on the official INOMAD KHURAL flag design.
 * Used as the center of all circular council visualizations.
 */

import React from 'react';

interface TengriSymbolProps {
  size?: number;
  className?: string;
  showCircle?: boolean; // Show the dotted circle around symbol
}

export function TengriSymbol({ 
  size = 120, 
  className = '',
  showCircle = false 
}: TengriSymbolProps) {
  const dotCount = 40; // Number of dots in circle
  const dotRadius = size * 0.45; // Radius of dot circle

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Dotted Circle (optional) */}
        {showCircle && (
          <g>
            {Array.from({ length: dotCount }).map((_, i) => {
              const angle = (i / dotCount) * 2 * Math.PI;
              const x = 60 + Math.cos(angle) * dotRadius;
              const y = 60 + Math.sin(angle) * dotRadius;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="2"
                  fill="#FEFCE8"
                  opacity="0.9"
                />
              );
            })}
          </g>
        )}

        {/* Fire (Top) */}
        <g className="tengri-fire">
          <path
            d="M 60 25 
               Q 58 30, 56 32 
               Q 58 34, 60 38
               Q 62 34, 64 32
               Q 62 30, 60 25 Z"
            fill="#FEFCE8"
            className="animate-fire-flicker"
          />
          {/* Inner flame */}
          <path
            d="M 60 28
               Q 59 31, 60 34
               Q 61 31, 60 28 Z"
            fill="#FEF3C7"
            opacity="0.8"
          />
        </g>

        {/* Sun (Middle) */}
        <circle
          cx="60"
          cy="60"
          r="18"
          fill="#FEFCE8"
          className="tengri-sun"
        />
        {/* Sun inner glow */}
        <circle
          cx="60"
          cy="60"
          r="14"
          fill="#FEF3C7"
          opacity="0.6"
        />

        {/* Moon Crescent (Bottom) */}
        <g className="tengri-moon">
          <path
            d="M 45 85
               Q 60 78, 75 85
               Q 60 95, 45 85 Z"
            fill="#FEFCE8"
          />
          {/* Moon shadow effect */}
          <path
            d="M 48 85
               Q 60 79, 72 85
               Q 60 93, 48 85 Z"
            fill="#FEF3C7"
            opacity="0.7"
          />
        </g>
      </svg>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fire-flicker {
          0%, 100% {
            transform: scaleY(1) translateY(0);
            opacity: 1;
          }
          50% {
            transform: scaleY(1.1) translateY(-1px);
            opacity: 0.95;
          }
        }

        .animate-fire-flicker {
          animation: fire-flicker 2s ease-in-out infinite;
          transform-origin: 60px 38px;
        }
      `}</style>
    </div>
  );
}
