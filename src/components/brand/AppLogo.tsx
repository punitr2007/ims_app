'use client';

import React from 'react';
import clsx from 'clsx';
import Image from 'next/image';

interface AppLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
  priority?: boolean;
}

export function AppLogo({
  size = 36,
  className = '',
  showGlow = true,
  priority = false,
}: AppLogoProps) {
  return (
    <div
      className={clsx(
        'relative flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105',
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Specular Neon Glow Bloom */}
      {showGlow && (
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[var(--brand-from,#84cc16)] to-[var(--brand-to,#06b6d4)] opacity-40 blur-md group-hover:opacity-75 transition-opacity duration-300 pointer-events-none"
          style={{ transform: 'scale(1.15)' }}
        />
      )}

      {/* High-Resolution Razor-Sharp SVG with Dynamic Theme Gradient */}
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-md"
      >
        <defs>
          <linearGradient id="appLogoDynamicGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--brand-from, #84cc16)" />
            <stop offset="40%" stopColor="var(--brand-accent, #10b981)" />
            <stop offset="100%" stopColor="var(--brand-to, #06b6d4)" />
          </linearGradient>

          <mask id="appLogoSlitMask">
            <rect width="512" height="512" fill="#ffffff" />
            <line
              x1="145"
              y1="340"
              x2="280"
              y2="275"
              stroke="#000000"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <line
              x1="172"
              y1="382"
              x2="315"
              y2="312"
              stroke="#000000"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <line
              x1="212"
              y1="418"
              x2="320"
              y2="366"
              stroke="#000000"
              strokeWidth="28"
              strokeLinecap="round"
            />
          </mask>
        </defs>

        <path
          d="M 256 68 
             C 264 68, 272 73, 276 80 
             L 396 150 
             C 404 155, 408 164, 408 174 
             L 408 338 
             C 408 348, 404 357, 396 362 
             L 276 432 
             C 268 437, 260 442, 256 442 
             C 252 442, 244 437, 236 432 
             L 116 362 
             C 108 357, 104 348, 104 338 
             L 104 174 
             C 104 164, 108 155, 116 150 
             L 236 80 
             C 240 73, 248 68, 256 68 Z"
          fill="url(#appLogoDynamicGrad)"
          mask="url(#appLogoSlitMask)"
        />
      </svg>
    </div>
  );
}
