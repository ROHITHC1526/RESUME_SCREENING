import React, { useState } from 'react';

interface AnimatedLogoutButtonProps {
  onLogout: () => void;
  className?: string;
}

export const AnimatedLogoutButton: React.FC<AnimatedLogoutButtonProps> = ({ onLogout, className = '' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleClick = () => {
    setIsExiting(true);
    setTimeout(() => {
      onLogout();
    }, 450);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Sign Out"
      className={`group relative flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 select-none overflow-hidden
        bg-ink-800 hover:bg-red-950/40 text-paper-200 hover:text-white border border-ink-700 hover:border-red-500/40 shadow-sm hover:shadow-lg active:scale-95 ${className}`}
      style={{ perspective: '800px' }}
    >
      <span className="relative z-10 transition-colors duration-200">
        {isExiting ? 'Leaving...' : 'Log Out'}
      </span>

      {/* Doorway & Walking Man Animation Container */}
      <div className="relative w-7 h-7 flex items-center justify-center">
        {/* Door Frame */}
        <div className="relative w-5 h-6 border-2 border-indigo-300 dark:border-indigo-400/80 rounded-sm bg-indigo-950/40 overflow-visible flex items-center justify-start">
          {/* Light beam from doorway on hover */}
          <div
            className={`absolute inset-0 bg-gradient-to-r from-amber-300/30 to-transparent transition-opacity duration-300 pointer-events-none ${
              isHovered || isExiting ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Swinging Door Leaf */}
          <div
            className="absolute top-0 left-0 w-full h-full bg-indigo-600 dark:bg-indigo-500 rounded-sm border border-indigo-400/60 shadow-sm flex items-center justify-end pr-0.5 transition-transform duration-400 ease-out origin-left"
            style={{
              transform: isHovered || isExiting
                ? 'perspective(400px) rotateY(-65deg)'
                : 'perspective(400px) rotateY(0deg)',
              boxShadow: isHovered ? '-2px 0 8px rgba(0,0,0,0.5)' : 'none'
            }}
          >
            {/* Door Knob */}
            <div className="w-1 h-1 rounded-full bg-amber-300 shadow-sm"></div>
          </div>

          {/* Walking Man Silhouette Icon */}
          <div
            className={`absolute -bottom-0.5 transition-all duration-500 ease-out ${
              isHovered || isExiting
                ? 'left-3 opacity-100 translate-x-1 scale-105'
                : 'left-0.5 opacity-0 -translate-x-2 scale-90'
            }`}
          >
            <svg
              className={`w-4 h-5 text-emerald-300 fill-current drop-shadow transition-transform duration-300 ${
                isHovered || isExiting ? 'animate-walk' : ''
              }`}
              viewBox="0 0 24 24"
            >
              {/* Head */}
              <circle cx="14" cy="4" r="2.5" />
              {/* Body & Running Legs */}
              <path d="M13 7.5c-1 0-2.5.8-3.2 1.8l-2 2.5a1 1 0 0 0 1.6 1.2l1.6-2 1.2 4.5-2.2 4.5a1 1 0 1 0 1.8.8l2.2-4.5 2.5 1.5v3.5a1 1 0 1 0 2 0v-4.2a1.2 1.2 0 0 0-.6-1l-2.4-1.5 1.2-3.8 2 1.5a1 1 0 0 0 1.2-1.6l-2.8-2.1a2 2 0 0 0-1.2-.4h-1.9z" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
};
