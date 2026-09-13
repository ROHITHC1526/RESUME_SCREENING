import React from 'react';
import { ShieldCheck, Cpu, GitBranch, CheckCircle2 } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-paper-50 font-sans">
      {/* Left Panel: Branded Editorial & Animated Agent Pipeline Illustration */}
      <div className="lg:col-span-5 bg-ink-900 text-paper-50 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        {/* Abstract background grid overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C97A3D_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-amber-brand flex items-center justify-center text-ink-900 font-serif font-bold text-xl shadow-lg">
              R
            </div>
            <div>
              <span className="font-serif text-2xl tracking-wide font-bold text-paper-50 block leading-tight">RecruitPulse</span>
              <span className="text-xs uppercase tracking-widest text-amber-brand font-semibold">Agentic Intelligence</span>
            </div>
          </div>

          <h2 className="font-serif text-3xl lg:text-4xl font-normal text-paper-50 leading-tight mb-4">
            Fair, evidence-backed candidate ranking driven by multi-agent AI.
          </h2>
          <p className="text-paper-300 text-sm leading-relaxed mb-8">
            Zero PII bias. 100% explainable recommendations with text span evidence quotes.
          </p>

          {/* Animated SVG Agent Pipeline Diagram */}
          <div className="bg-ink-800/80 border border-ink-700 rounded-xl p-5 shadow-2xl backdrop-blur-sm">
            <div className="text-xs font-mono uppercase text-amber-brand mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 animate-pulse" /> Agent Graph Pipeline Active
            </div>

            <svg viewBox="0 0 400 120" className="w-full h-auto text-paper-200">
              {/* Nodes */}
              <g transform="translate(30, 60)">
                <circle r="18" className="fill-ink-700 stroke-amber-brand stroke-2" />
                <text textAnchor="middle" dy="4" fontSize="10" fill="#FAF7F0" className="font-mono">JD</text>
              </g>
              <g transform="translate(110, 60)">
                <circle r="18" className="fill-ink-700 stroke-emerald-brand stroke-2" />
                <text textAnchor="middle" dy="4" fontSize="10" fill="#FAF7F0" className="font-mono">PII</text>
              </g>
              <g transform="translate(190, 60)">
                <circle r="18" className="fill-ink-700 stroke-amber-brand stroke-2" />
                <text textAnchor="middle" dy="4" fontSize="10" fill="#FAF7F0" className="font-mono">RAG</text>
              </g>
              <g transform="translate(270, 60)">
                <circle r="18" className="fill-ink-700 stroke-emerald-brand stroke-2" />
                <text textAnchor="middle" dy="4" fontSize="10" fill="#FAF7F0" className="font-mono">EVAL</text>
              </g>
              <g transform="translate(350, 60)">
                <circle r="18" className="fill-amber-brand stroke-paper-50 stroke-2" />
                <text textAnchor="middle" dy="4" fontSize="10" fill="#0B1220" className="font-mono font-bold">RANK</text>
              </g>

              {/* Connecting Lines */}
              <line x1="48" y1="60" x2="92" y2="60" className="stroke-amber-brand/60 stroke-2 stroke-dasharray-4 animate-pulse" />
              <line x1="128" y1="60" x2="172" y2="60" className="stroke-emerald-brand/60 stroke-2" />
              <line x1="208" y1="60" x2="252" y2="60" className="stroke-amber-brand/60 stroke-2" />
              <line x1="288" y1="60" x2="332" y2="60" className="stroke-emerald-brand/60 stroke-2" />
            </svg>

            <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] text-paper-300 border-t border-ink-700 pt-3">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-brand" /> Automatic PII Masking
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-brand" /> Audit-Logged Overrides
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-paper-300 border-t border-ink-800 pt-4 mt-8 flex justify-between items-center">
          <span>&copy; 2026 RecruitPulse Intelligence</span>
          <span className="font-mono text-[10px] bg-ink-800 px-2 py-0.5 rounded text-amber-brand">v1.0 LangGraph Engine</span>
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md bg-white border border-paper-200 rounded-2xl shadow-xl p-8 sm:p-10 relative">
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold text-ink-900 mb-2">{title}</h1>
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
