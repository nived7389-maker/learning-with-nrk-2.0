import React from "react";

interface NrkLogoProps {
  className?: string;
  size?: number | string;
}

export function NrkLogo({ className = "w-12 h-12", size }: NrkLogoProps) {
  const finalSize = size !== undefined ? size : undefined;

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} drop-shadow-[0_4px_12px_rgba(99,102,241,0.25)] dark:drop-shadow-[0_4px_16px_rgba(99,102,241,0.4)] transition-all`}
      style={finalSize !== undefined ? { width: finalSize, height: finalSize } : {}}
    >
      <defs>
        {/* Background Gradient resembling deep space blue */}
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#0e1726" />
          <stop offset="100%" stopColor="#040811" />
        </radialGradient>

        {/* Glowing Effects */}
        <filter id="neonGlowBlue" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="neonGlowOrange" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="neonGlowPurple" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        
        {/* Core Gradients */}
        <linearGradient id="blueLetters" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d2ff" />
          <stop offset="100%" stopColor="#0066ff" />
        </linearGradient>

        <linearGradient id="orangeBadge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff9900" />
          <stop offset="100%" stopColor="#ff5500" />
        </linearGradient>

        <linearGradient id="purpleBadge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d426ff" />
          <stop offset="100%" stopColor="#6b00d4" />
        </linearGradient>

        <linearGradient id="greenBadge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ffcc" />
          <stop offset="100%" stopColor="#00aa66" />
        </linearGradient>
      </defs>

      {/* Dotted/Dashed Orbit Pathways */}
      <path d="M 28 45 C 45 25, 75 25, 92 45" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 3" fill="none" />
      <path d="M 24 75 C 35 85, 85 85, 96 75" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" fill="none" />
      <path d="M 95 40 C 90 60, 110 75, 92 85" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="1.5 2" fill="none" />

      {/* Neon Glowing Orbit Science Cards */}
      {/* 1. Top Left Physics Atom Card (Cyan/Blue Glow) */}
      <g transform="translate(25, 23)" filter="url(#neonGlowBlue)" opacity="0.95">
        <rect x="-6" y="-6" width="12" height="12" rx="3.5" fill="#040811" stroke="#00d2ff" strokeWidth="1" />
        <ellipse cx="0" cy="0" rx="1.5" ry="4" transform="rotate(30)" stroke="#00d2ff" strokeWidth="0.5" fill="none" />
        <ellipse cx="0" cy="0" rx="1.5" ry="4" transform="rotate(-30)" stroke="#00d2ff" strokeWidth="0.5" fill="none" />
        <circle cx="0" cy="0" r="0.75" fill="#ffffff" />
      </g>

      {/* 2. Top Right Chemistry Beaker Card (Purple Glow) */}
      <g transform="translate(90, 25)" filter="url(#neonGlowPurple)" opacity="0.95">
        <rect x="-6" y="-6" width="12" height="12" rx="3.5" fill="#040811" stroke="#d426ff" strokeWidth="1" />
        <path d="M -2 -3 L 2 -3" stroke="#d426ff" strokeWidth="0.7" />
        <path d="M -1 -3 L -1 -1 L -3 2 C -3.5 3, -1 4, 0 4 C 1 4, 3.5 3, 3 2 L 1 -1 L 1 -3" stroke="#d426ff" strokeWidth="0.7" fill="none" />
        <circle cx="0" cy="2" r="1.2" fill="#d426ff" />
      </g>

      {/* 3. Bottom Left Book Card (Orange Glow) */}
      <g transform="translate(20, 68)" filter="url(#neonGlowOrange)" opacity="0.95">
        <rect x="-7" y="-7" width="14" height="14" rx="4" fill="#040811" stroke="#ff8800" strokeWidth="1" />
        <path d="M -4 -3 C -1 -4, 0 -2, 0 -2 C 0 -2, 1 -4, 4 -3" stroke="#ff8800" strokeWidth="0.7" fill="none" />
        <path d="M -4 2 C -1 1, 0 3, 0 3 C 0 3, 1 1, 4 2" stroke="#ff8800" strokeWidth="0.7" fill="none" />
        <line x1="-4" y1="-3" x2="-4" y2="2" stroke="#ff8800" strokeWidth="0.7" />
        <line x1="4" y1="-3" x2="4" y2="2" stroke="#ff8800" strokeWidth="0.7" />
        <line x1="0" y1="-2" x2="0" y2="3" stroke="#ff8800" strokeWidth="0.7" />
      </g>

      {/* 4. Bottom Right Writer Pencil Card (Teal Glow) */}
      <g transform="translate(96, 70)" filter="url(#neonGlowBlue)" opacity="0.95">
        <rect x="-6" y="-6" width="12" height="12" rx="3.5" fill="#040811" stroke="#00ffcc" strokeWidth="1" />
        <path d="M -2 2 L 2 -2" stroke="#00ffcc" strokeWidth="0.8" fill="none" />
        <path d="M -2 2 L -3 3 L -2 3 Z" fill="#00ffcc" />
      </g>

      {/* Central Paper Airplane (White flight tracker) */}
      <g transform="translate(68, 25)">
        <path d="M -4 1 L 4 -3 L 1 3 L -0.5 0.5 Z" fill="#ffffff" opacity="0.8" />
      </g>

      {/* Central "NR" Massive Styled Graphic */}
      <g transform="translate(60, 64)">
        <path d="M -23 12 L -23 -16 L -16 -16 L -5 3 L -5 -16 L 2 -16 L 2 12 L -5 12 L -16 -7 L -16 12 Z" fill="#ffffff" />
        <path d="M 5 12 L 5 -16 L 16 -16 C 22 -16, 26 -12, 26 -7 C 26 -3, 22 1, 16 1 L 11 1 L 21 12 L 13 12 L 5.5 2 L 11 2 C 15 2, 19 0, 19 -4 C 19 -8, 15 -9, 11 -9 L 11 12 Z" fill="url(#blueLetters)" />
      </g>

      {/* White Graduation Cap (Sitting elegantly on the letters) */}
      <g transform="translate(58, 45)">
        <polygon points="0,-12 18,-6 0,0 -18,-6" fill="#ffffff" stroke="#1e293b" strokeWidth="0.5" />
        <path d="M -8 -4 L -8 -1 L 8 -1 L 8 -4 L 0 -1.5 Z" fill="#e2e8f0" />
        <path d="M 12 -4.5 L 14 0 L 14 3" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" fill="none" />
        <polygon points="13,3 15,3 14,5" fill="#f8fafc" />
      </g>

      {/* Open book graphic in the bottom foreground supporting letters */}
      <g transform="translate(60, 92)">
        <path d="M -32 -2 C -18 -10, -5 -4, 0 1 C 5 -4, 18 -10, 32 -2 L 32 4 C 18 -4, 5 2, 0 7 C -5 2, -18 -4, -32 4 Z" fill="#ffffff" stroke="#0066ff" strokeWidth="0.8" />
        <path d="M -30 2 C -17 -6, -5 0, 0 5 M 0 5 C 5 0, 17 -6, 30 2" stroke="#00d2ff" strokeWidth="0.8" fill="none" />
      </g>
    </svg>
  );
}
