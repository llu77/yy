"use client";

import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  showText?: boolean;
}

export function Logo({ width = 180, height = 40, className = "", showText = true }: LogoProps) {
  const [imageError, setImageError] = useState(false);
  
  if (imageError) {
    // Fallback SVG logo
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 250 50"
        width={width}
        height={height}
        className={className}
      >
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="32"
          fontWeight="700"
          fill="hsl(var(--primary))"
          fontFamily="'Tajawal', sans-serif"
        >
          GASAH
        </text>
      </svg>
    );
  }
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image 
        src="/logo.png" 
        alt="GASAH Logo" 
        width={showText ? 50 : width}
        height={showText ? 50 : height}
        priority
        onError={() => setImageError(true)}
        style={{
          objectFit: 'contain',
          height: 'auto'
        }}
      />
      {showText && (
        <span className="text-2xl font-bold text-primary hidden sm:block">
          GASAH
        </span>
      )}
    </div>
  );
}