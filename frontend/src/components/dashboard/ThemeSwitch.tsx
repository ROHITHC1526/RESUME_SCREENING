import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeSwitch: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className="relative w-16 h-8 rounded-full p-1 transition-colors duration-500 cursor-pointer shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-brand/50 overflow-hidden border border-white/20"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 60%, #415a77 100%)'
            : 'linear-gradient(135deg, #56CCF2 0%, #2F80ED 100%)'
        }}
      >
        {/* Sky Background Decor */}
        {isDark ? (
          /* Night Stars */
          <div className="absolute inset-0 pointer-events-none transition-opacity duration-500">
            <span className="absolute top-1.5 left-2 w-1 h-1 bg-white/90 rounded-full animate-pulse"></span>
            <span className="absolute bottom-2 left-4 w-0.5 h-0.5 bg-white/70 rounded-full"></span>
            <span className="absolute top-2.5 left-6 w-1 h-1 bg-amber-200/80 rounded-full"></span>
            <span className="absolute top-1 left-9 w-0.5 h-0.5 bg-white/80 rounded-full"></span>
            {/* Soft night cloud */}
            <div className="absolute -bottom-2 -left-1 opacity-25">
              <svg width="24" height="14" viewBox="0 0 24 14" fill="white">
                <circle cx="8" cy="8" r="6" />
                <circle cx="16" cy="7" r="5" />
              </svg>
            </div>
          </div>
        ) : (
          /* Day Clouds */
          <div className="absolute inset-0 pointer-events-none transition-opacity duration-500">
            {/* Fluffy white clouds */}
            <div className="absolute top-1 right-2 opacity-90 transition-transform duration-500">
              <svg width="28" height="18" viewBox="0 0 28 18" fill="white">
                <circle cx="12" cy="11" r="6" fill="white" />
                <circle cx="18" cy="10" r="5" fill="white" />
                <circle cx="7" cy="12" r="4" fill="white" />
                <ellipse cx="14" cy="13" rx="10" ry="3" fill="white" />
              </svg>
            </div>
            <div className="absolute bottom-0.5 right-6 opacity-60">
              <svg width="18" height="10" viewBox="0 0 18 10" fill="white">
                <circle cx="8" cy="6" r="4" />
                <circle cx="13" cy="5" r="3" />
              </svg>
            </div>
          </div>
        )}

        {/* Sliding Thumb: Sun or Moon */}
        <div
          className="relative z-10 w-6 h-6 rounded-full transition-transform duration-500 flex items-center justify-center shadow-md"
          style={{
            transform: isDark ? 'translateX(32px)' : 'translateX(0px)',
            transitionTimingFunction: 'cubic-bezier(0.34, 1.28, 0.42, 1)',
            background: isDark
              ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 50%, #94a3b8 100%)'
              : 'linear-gradient(135deg, #FFF67E 0%, #FFB800 60%, #FF8A00 100%)',
            boxShadow: isDark
              ? '0 0 8px rgba(255, 255, 255, 0.4), inset -1px -1px 2px rgba(0,0,0,0.3)'
              : '0 0 10px rgba(255, 184, 0, 0.8), 0 0 4px rgba(255, 230, 0, 0.6)'
          }}
        >
          {isDark ? (
            /* Moon Craters */
            <div className="relative w-full h-full rounded-full overflow-hidden">
              <span className="absolute top-1 left-1.5 w-1.5 h-1.5 bg-slate-400/40 rounded-full"></span>
              <span className="absolute bottom-1.5 right-1.5 w-1 h-1 bg-slate-400/50 rounded-full"></span>
              <span className="absolute top-3 left-3 w-1 h-1 bg-slate-400/30 rounded-full"></span>
            </div>
          ) : (
            /* Sun Glow Center */
            <div className="w-2 h-2 rounded-full bg-white/40"></div>
          )}
        </div>
      </button>

      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-paper-300 mt-1">
        {isDark ? 'Dark' : 'Light'}
      </span>
    </div>
  );
};
