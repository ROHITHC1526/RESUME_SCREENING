import React from 'react';

interface InfinityLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
}

export const InfinityLoader: React.FC<InfinityLoaderProps> = ({
  size = 'md',
  message,
  submessage,
  fullScreen = false
}) => {
  const sizeMap = {
    sm: { svg: 'w-16 h-10', stroke: 4, container: 'p-2' },
    md: { svg: 'w-24 h-14', stroke: 5, container: 'p-4' },
    lg: { svg: 'w-36 h-20', stroke: 5.5, container: 'p-6' },
    xl: { svg: 'w-48 h-28', stroke: 6, container: 'p-8' }
  };

  const { svg, stroke, container } = sizeMap[size] || sizeMap.md;

  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-none ${container}`}>
      {/* Infinity Symbol (∞) Container */}
      <div className="relative flex items-center justify-center">
        
        {/* Ambient Radial Glow Aura */}
        <div className="absolute inset-0 w-full h-full bg-amber-500/25 blur-xl rounded-full animate-pulse pointer-events-none" />

        {/* The Animated Infinity Symbol (∞) SVG */}
        <svg
          viewBox="0 0 160 90"
          className={`${svg} drop-shadow-[0_0_15px_rgba(201,122,61,0.9)] overflow-visible`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Linear Gradient across the infinity path */}
            <linearGradient id="infinityGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C97A3D" />
              <stop offset="35%" stopColor="#FFB800" />
              <stop offset="70%" stopColor="#FF8A00" />
              <stop offset="100%" stopColor="#1E7A5F" />
            </linearGradient>

            <filter id="infinityNeonFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Infinity Track (Muted Path) */}
          <path
            d="M 80,45 C 50,15 10,15 10,45 C 10,75 50,75 80,45 C 110,15 150,15 150,45 C 150,75 110,75 80,45 Z"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink-700/40 dark:text-ink-600/40"
          />

          {/* Animated Flowing Laser Stroke along Infinity (∞) Path */}
          <path
            d="M 80,45 C 50,15 10,15 10,45 C 10,75 50,75 80,45 C 110,15 150,15 150,45 C 150,75 110,75 80,45 Z"
            stroke="url(#infinityGlowGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#infinityNeonFilter)"
            className="infinity-laser-path"
          />
        </svg>

        {/* Pulsing Energy Particle at Infinity Intersection */}
        <div className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#FFF] animate-ping opacity-80 pointer-events-none" />
      </div>

      {/* Message and Submessage */}
      {message && (
        <div className="mt-4">
          <p className="font-serif text-sm sm:text-base font-bold text-ink-900 dark:text-paper-50 tracking-wide animate-pulse">
            {message}
          </p>
          {submessage && (
            <p className="font-mono text-xs text-gray-500 dark:text-paper-300 mt-1 max-w-sm">
              {submessage}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-ink-900/70 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white/90 dark:bg-ink-800/90 border border-paper-300 dark:border-ink-700 rounded-3xl p-8 shadow-2xl max-w-md w-full flex flex-col items-center">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
