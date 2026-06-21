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
        {/* Core Vibrant Gradient representing Future & Intelligence */}
        <linearGradient id="nrkPrimaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" /> {/* Pink */}
          <stop offset="50%" stopColor="#8b5cf6" /> {/* Indigo / Purple */}
          <stop offset="100%" stopColor="#06b6d4" /> {/* Cyan */}
        </linearGradient>

        <linearGradient id="nrkAccentGrad" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#4facfe" />
        </linearGradient>

        <filter id="nrkSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Orbit Rings (Representing Science & Technology) */}
      <circle
        cx="60"
        cy="60"
        r="48"
        stroke="url(#nrkPrimaryGrad)"
        strokeWidth="1.5"
        strokeDasharray="4 6"
        className="opacity-40 animate-[spin_40s_linear_infinite]"
      />
      <circle
        cx="60"
        cy="60"
        r="38"
        stroke="url(#nrkAccentGrad)"
        strokeWidth="1"
        className="opacity-20 animate-[spin_20s_linear_infinite_reverse]"
      />

      {/* Main Hexagonal Boundary for Tech feel */}
      <polygon
        points="60,18 96,39 96,81 60,102 24,81 24,39"
        fill="none"
        stroke="url(#nrkPrimaryGrad)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Stylized Open Book & Graduation Cap Mashup */}
      {/* Cap top structure / Diamond */}
      <path
        d="M60 26 L88 38 L60 50 L32 38 Z"
        fill="url(#nrkPrimaryGrad)"
        className="opacity-95"
      />

      {/* Elegant Ribbon/Tassel hanging from top */}
      <path
        d="M60 38 L45 52 L45 58"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-80"
      />

      {/* Open pages bottom contour */}
      <path
        d="M36 58 C44 54, 52 56, 60 62 C68 56, 76 54, 84 58 L84 78 C76 74, 68 76, 60 82 C52 76, 44 74, 36 78 Z"
        fill="url(#nrkPrimaryGrad)"
        className="opacity-90"
      />

      {/* Spine line */}
      <path
        d="M60 62 L60 82"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-75"
      />

      {/* Central Star/Atom Core of Knowledge */}
      <circle
        cx="60"
        cy="60"
        r="5"
        fill="#ffffff"
        filter="url(#nrkSoftGlow)"
      />
    </svg>
  );
}
