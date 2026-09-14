import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ThemeSwitch } from './ThemeSwitch';
import { AnimatedLogoutButton } from './AnimatedLogoutButton';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-ink-900 text-paper-50 border-b border-ink-800 sticky top-0 z-40 shadow-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/jobs" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-lg bg-amber-brand group-hover:bg-amber-hover transition-colors flex items-center justify-center text-ink-900 font-serif font-bold text-lg shadow-md">
            R
          </div>
          <div>
            <span className="font-serif text-xl font-bold tracking-wide block leading-none text-white">RecruitPulse</span>
            <span className="text-[10px] uppercase tracking-widest text-amber-brand font-semibold">Agentic Candidate Intelligence</span>
          </div>
        </Link>

        {user && (
          <div className="flex items-center space-x-4 sm:space-x-6">
            <Link to="/jobs" className="text-sm font-medium text-paper-200 hover:text-amber-brand flex items-center gap-1.5 transition-colors">
              <Briefcase className="w-4 h-4 text-amber-brand" /> 
              <span className="hidden sm:inline">Job Postings</span>
            </Link>

            {user.role === 'admin' && (
              <Link to="/admin" className="text-sm font-medium text-amber-brand hover:text-white flex items-center gap-1.5 transition-colors bg-amber-brand/10 px-2.5 py-1 rounded-lg border border-amber-brand/30">
                <ShieldCheck className="w-4 h-4 text-amber-brand" /> 
                <span className="hidden sm:inline">Admin Dashboard</span>
              </Link>
            )}

            <div className="h-4 w-px bg-ink-700"></div>

            {/* User Profile Badge */}
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-ink-700 border border-ink-600 flex items-center justify-center text-amber-brand font-semibold text-xs shadow-inner">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-paper-50 leading-tight">{user.full_name}</div>
                <div className="text-[10px] uppercase font-mono text-amber-brand font-bold">{user.role}</div>
              </div>
            </div>

            <div className="h-4 w-px bg-ink-700"></div>

            {/* Day / Night Theme Switcher at Top Corner */}
            <ThemeSwitch />

            {/* Animated Man Walking Out of Door Logout Button */}
            <AnimatedLogoutButton onLogout={handleLogout} />
          </div>
        )}
      </div>
    </header>
  );
};
