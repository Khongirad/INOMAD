"use client";

import { useState, useEffect, type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface GatewayPortalProps {
  children: ReactNode;
  isOpen?: boolean;
  onEnter?: () => void;
  title?: string;
  subtitle?: string;
  className?: string;
  lang?: "en" | "ru";
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// Creates a login portal effect (like WoW)
// ─────────────────────────────────────────────────────────────────────────────

export function GatewayPortal({
  children,
  isOpen = false,
  onEnter,
  title,
  subtitle,
  className = "",
  lang = "ru",
}: GatewayPortalProps) {
  const [entered, setEntered] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (entered) {
      const timer = setTimeout(() => setShowContent(true), 800);
      return () => clearTimeout(timer);
    }
  }, [entered]);

  const handleEnter = () => {
    setEntered(true);
    onEnter?.();
  };

  if (!isOpen) return null;

  // Showing контент после анимации loginа
  if (showContent) {
    return (
      <div
        className={`animate-in fade-in duration-500 ${className}`}
      >
        {children}
      </div>
    );
  }

  // Login animation
  if (entered) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        {/* Portal effect */}
        <div className="relative">
          {/* Outer glow */}
          <div className="absolute inset-0 animate-pulse">
            <div
              className="w-[400px] h-[400px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />
          </div>

          {/* Portal rings */}
          <div className="relative w-[300px] h-[300px]">
            {/* Outer ring */}
            <div
              className="absolute inset-0 rounded-full border-4 border-gold-border/50 animate-spin"
              style={{ animationDuration: "3s" }}
            />

            {/* Secondary ring */}
            <div
              className="absolute inset-4 rounded-full border-2 border-gold-text/30 animate-spin"
              style={{ animationDuration: "4s", animationDirection: "reverse" }}
            />

            {/* Inner ring */}
            <div
              className="absolute inset-8 rounded-full border border-gold-border/40 animate-spin"
              style={{ animationDuration: "2s" }}
            />

            {/* Portal center — collapsing */}
            <div
              className="absolute inset-12 rounded-full bg-gradient-to-br from-gold-border/20 to-transparent animate-ping"
              style={{ animationDuration: "1.5s" }}
            />

            {/* Center point */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gold-text animate-pulse" />
            </div>
          </div>

          {/* Text */}
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
            <div className="text-gold-text text-sm font-medium animate-pulse">
              {lang === "ru" ? "Login in пространство..." : "Entering space..."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initial screen — gates
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Background stars / particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Title */}
        {title && (
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-3">{title}</h1>
            {subtitle && (
              <p className="text-lg text-zinc-400 max-w-md">{subtitle}</p>
            )}
          </div>
        )}

        {/* Portal / Gates */}
        <button
          onClick={handleEnter}
          className="group relative cursor-pointer focus:outline-none"
        >
          {/* Outer glow */}
          <div className="absolute -inset-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div
              className="w-full h-full rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(212,175,55,0.4) 0%, transparent 70%)",
                filter: "blur(30px)",
              }}
            />
          </div>

          {/* Gate Arch */}
          <div className="relative w-[250px] h-[350px]">
            {/* Stone arch (outer contour) */}
            <svg
              viewBox="0 0 250 350"
              className="absolute inset-0 w-full h-full"
            >
              {/* Shadow */}
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="stoneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#52525b" />
                  <stop offset="50%" stopColor="#3f3f46" />
                  <stop offset="100%" stopColor="#27272a" />
                </linearGradient>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D4AF37" />
                  <stop offset="50%" stopColor="#F5D77A" />
                  <stop offset="100%" stopColor="#D4AF37" />
                </linearGradient>
              </defs>

              {/* Outer arch */}
              <path
                d="M30 350 L30 150 Q30 30 125 30 Q220 30 220 150 L220 350"
                fill="none"
                stroke="url(#stoneGradient)"
                strokeWidth="25"
                strokeLinecap="round"
              />

              {/* Golden ornament */}
              <path
                d="M40 340 L40 155 Q40 50 125 50 Q210 50 210 155 L210 340"
                fill="none"
                stroke="url(#goldGradient)"
                strokeWidth="3"
                filter="url(#glow)"
                className="group-hover:stroke-[4] transition-all"
              />

              {/* Runes on sides */}
              <g fill="#D4AF37" opacity="0.6" className="group-hover:opacity-100 transition-opacity">
                <text x="45" y="200" fontSize="16" fontFamily="serif">ᚱ</text>
                <text x="45" y="240" fontSize="16" fontFamily="serif">ᚢ</text>
                <text x="45" y="280" fontSize="16" fontFamily="serif">ᚾ</text>
                <text x="195" y="200" fontSize="16" fontFamily="serif">ᛏ</text>
                <text x="195" y="240" fontSize="16" fontFamily="serif">ᚨ</text>
                <text x="195" y="280" fontSize="16" fontFamily="serif">ᛚ</text>
              </g>

              {/* Keystone */}
              <path
                d="M110 35 L125 15 L140 35 Z"
                fill="#D4AF37"
                className="group-hover:fill-[#F5D77A] transition-colors"
              />
            </svg>

            {/* Внутреннее пространство portalа */}
            <div className="absolute inset-x-[50px] top-[60px] bottom-[10px] overflow-hidden rounded-t-full">
              {/* Gradient vortex */}
              <div
                className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-purple-900/20 to-black group-hover:from-blue-800/40 group-hover:via-purple-800/30 transition-colors duration-500"
              />

              {/* Stars inside */}
              <div className="absolute inset-0">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-0.5 h-0.5 bg-white/40 rounded-full animate-pulse"
                    style={{
                      left: `${20 + Math.random() * 60}%`,
                      top: `${10 + Math.random() * 80}%`,
                      animationDelay: `${Math.random() * 2}s`,
                    }}
                  />
                ))}
              </div>

              {/* Central glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-8 h-8 rounded-full bg-gold-text/30 group-hover:bg-gold-text/50 group-hover:w-12 group-hover:h-12 transition-all duration-500 animate-pulse"
                  style={{ filter: "blur(8px)" }}
                />
              </div>
            </div>
          </div>

          {/* Text under gates */}
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center">
            <div className="text-gold-text text-lg font-medium group-hover:text-gold-border transition-colors">
              {lang === "ru" ? "Sign in" : "Enter"}
            </div>
            <div className="text-zinc-500 text-xs mt-1 group-hover:text-zinc-400 transition-colors">
              {lang === "ru" ? "Нажмите, чтобы continue" : "Click to continue"}
            </div>
          </div>
        </button>

        {/* Key phrase */}
        <div className="mt-24 text-center max-w-lg px-4">
          <p className="text-zinc-400 text-sm italic leading-relaxed">
            {lang === "ru"
              ? "«Ты loginишь in общее пространство, где each знает свой дом, уважает чужой, и развивается вместе с другими.»"
              : '"You enter a shared space where everyone knows their home, respects others\', and grows together."'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default GatewayPortal;
