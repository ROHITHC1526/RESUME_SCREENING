import React, { useState } from 'react';
import { ShieldCheck, Cpu, CheckCircle2, Sparkles } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  const [isLampOn, setIsLampOn] = useState(true);
  const [isPulling, setIsPulling] = useState(false);

  const handleToggleLamp = () => {
    setIsPulling(true);
    setTimeout(() => {
      setIsLampOn((prev) => !prev);
    }, 150);
    setTimeout(() => {
      setIsPulling(false);
    }, 500);
  };

  return (
    <div
      className={`min-h-screen relative flex flex-col justify-between font-sans transition-colors duration-700 select-none overflow-hidden ${
        isLampOn ? 'bg-[#0B1220] text-paper-50' : 'bg-[#030508] text-gray-400'
      }`}
    >
      {/* Light Cone Overlay when Lamp is ON */}
      {isLampOn && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700 z-0 light-cone-active"
          style={{
            background: 'radial-gradient(ellipse 90% 75% at 78% 30%, rgba(255, 214, 102, 0.18) 0%, rgba(201, 122, 61, 0.08) 45%, transparent 75%)'
          }}
        />
      )}

      {/* Top Header Bar */}
      <header className="relative z-20 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-brand flex items-center justify-center text-ink-900 font-serif font-bold text-xl shadow-lg shadow-amber-brand/30">
            R
          </div>
          <div>
            <span className="font-serif text-2xl tracking-wide font-bold text-white block leading-tight">
              RecruitPulse
            </span>
            <span className="text-[10px] uppercase tracking-widest text-amber-brand font-semibold font-mono">
              Agentic Candidate Intelligence
            </span>
          </div>
        </div>

        {/* Lamp Control Status Pill */}
        <button
          onClick={handleToggleLamp}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all duration-300 border ${
            isLampOn
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isLampOn ? 'bg-amber-400 shadow-[0_0_8px_#F59E0B]' : 'bg-gray-600'}`}></span>
          <span>Room Lamp: {isLampOn ? 'ON' : 'OFF (Click to Illuminate)'}</span>
        </button>
      </header>

      {/* Main Stage: Left Editorial & Form (Illuminated) + Right Lamp */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-6 py-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left / Center Section: Appears when Lamp is ON; Vanishes when Lamp is OFF */}
        <div
          className={`lg:col-span-8 transition-all duration-700 ease-in-out ${
            isLampOn
              ? 'opacity-100 translate-y-0 pointer-events-auto filter-none'
              : 'opacity-0 -translate-y-4 pointer-events-none blur-sm'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Editorial Feature Highlight */}
            <div className="md:col-span-5 hidden md:block space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-brand/20 border border-amber-brand/40 text-amber-brand text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> Next-Gen AI Screening
              </div>
              <h2 className="font-serif text-3xl lg:text-4xl font-normal text-white leading-tight">
                Fair, evidence-backed candidate ranking driven by multi-agent AI.
              </h2>
              <p className="text-paper-300 text-xs leading-relaxed">
                Zero PII bias. 100% explainable recommendations with text span evidence quotes & real resume skill verification.
              </p>

              {/* Agent Pipeline Mini Preview */}
              <div className="bg-ink-800/80 border border-ink-700 rounded-xl p-4 shadow-xl backdrop-blur-sm">
                <div className="text-[10px] font-mono uppercase text-amber-brand mb-2 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 animate-pulse" /> Agent Graph Pipeline Active
                </div>
                <div className="flex items-center justify-between text-[11px] text-paper-200">
                  <span className="px-2 py-1 bg-ink-700 rounded text-amber-brand font-mono font-bold">JD Parser</span>
                  <span>&rarr;</span>
                  <span className="px-2 py-1 bg-ink-700 rounded text-emerald-400 font-mono font-bold">PII Strip</span>
                  <span>&rarr;</span>
                  <span className="px-2 py-1 bg-ink-700 rounded text-cyan-400 font-mono font-bold">Vector RAG</span>
                  <span>&rarr;</span>
                  <span className="px-2 py-1 bg-amber-brand text-ink-900 rounded font-mono font-bold">Rank</span>
                </div>
              </div>
            </div>

            {/* Auth Form Card */}
            <div className="md:col-span-7">
              <div
                className="w-full bg-[#111A2E]/95 border border-ink-600/80 rounded-2xl shadow-2xl p-8 sm:p-10 relative backdrop-blur-md"
                style={{
                  boxShadow: isLampOn
                    ? '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(201, 122, 61, 0.15)'
                    : 'none'
                }}
              >
                <div className="mb-6">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-2">{title}</h1>
                  <p className="text-xs sm:text-sm text-paper-300">{subtitle}</p>
                </div>

                {children}
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Interactive Realistic Desk / Floor Lamp */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center relative py-6">
          <div className="relative flex flex-col items-center select-none">
            
            {/* Instructional Tooltip when Lamp is OFF */}
            {!isLampOn && (
              <div className="absolute -top-12 z-30 animate-bounce">
                <div className="bg-amber-400 text-ink-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                  <span>💡 Click lamp or pull string to turn ON!</span>
                </div>
              </div>
            )}

            {/* Lamp Shade & Light Beam */}
            <div className="relative flex flex-col items-center">
              
              {/* Lamp Shade Top Cap */}
              <div
                onClick={handleToggleLamp}
                className="w-12 h-3 rounded-t-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700 cursor-pointer shadow-md"
              />

              {/* Conical Lamp Shade Body */}
              <div
                onClick={handleToggleLamp}
                className="relative w-44 h-24 cursor-pointer transition-all duration-300 group"
                style={{
                  clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                  background: isLampOn
                    ? 'linear-gradient(180deg, #D4AF37 0%, #AA771C 60%, #F3E5AB 100%)'
                    : 'linear-gradient(180deg, #2A2D34 0%, #1A1C20 100%)',
                  boxShadow: isLampOn ? '0 -5px 25px rgba(255, 215, 0, 0.4)' : 'none'
                }}
              >
                {/* Metallic Shade highlight */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/30 pointer-events-none" />
              </div>

              {/* Lamp Diffuser / Glowing Bulb Rim */}
              <div
                onClick={handleToggleLamp}
                className="w-44 h-4 -mt-1 rounded-full cursor-pointer transition-all duration-500 relative z-10"
                style={{
                  background: isLampOn
                    ? 'radial-gradient(ellipse at center, #FFFFFF 0%, #FFF3B0 40%, #FFD700 80%, #FFA500 100%)'
                    : '#15171C',
                  boxShadow: isLampOn
                    ? '0 5px 30px 10px rgba(255, 215, 0, 0.9), 0 0 60px 20px rgba(255, 170, 0, 0.6)'
                    : '0 2px 5px rgba(0,0,0,0.5)'
                }}
              />

              {/* Hanging Pull-Cord Switch */}
              <div
                onClick={handleToggleLamp}
                className={`absolute top-24 right-10 cursor-pointer z-20 flex flex-col items-center ${
                  isPulling ? 'animate-pull' : ''
                }`}
                title="Pull string to toggle lamp"
              >
                {/* Thin Brass Cord Thread */}
                <div
                  className="w-0.5 bg-gradient-to-b from-amber-400 to-amber-600 transition-all duration-300"
                  style={{ height: '42px' }}
                />
                
                {/* Pull Cord Tassel / Ring Toggle */}
                <div
                  className={`w-3.5 h-5 rounded-full border border-amber-300 flex items-center justify-center shadow-md transition-all ${
                    isLampOn
                      ? 'bg-gradient-to-b from-amber-300 to-amber-600 shadow-amber-400/50'
                      : 'bg-gradient-to-b from-amber-500 to-amber-700 animate-pulse shadow-[0_0_10px_#F59E0B]'
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                </div>
              </div>

              {/* Radiating Light Beam underneath shade */}
              {isLampOn && (
                <div
                  className="absolute top-26 w-80 h-72 pointer-events-none -z-10 transition-opacity duration-700"
                  style={{
                    clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)',
                    background: 'linear-gradient(180deg, rgba(255, 230, 120, 0.45) 0%, rgba(255, 200, 80, 0.18) 50%, transparent 100%)',
                    filter: 'blur(4px)'
                  }}
                />
              )}

              {/* Lamp Stem / Rod */}
              <div
                className="w-2.5 h-48 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-800 shadow-inner"
                style={{
                  background: isLampOn
                    ? 'linear-gradient(90deg, #8B6508 0%, #D4AF37 50%, #5E4505 100%)'
                    : 'linear-gradient(90deg, #1C1F26 0%, #2E3440 50%, #15181E 100%)'
                }}
              />

              {/* Lamp Circular Base */}
              <div
                className="w-32 h-6 rounded-t-full shadow-2xl relative"
                style={{
                  background: isLampOn
                    ? 'radial-gradient(ellipse at top, #F3E5AB 0%, #D4AF37 60%, #8B6508 100%)'
                    : 'radial-gradient(ellipse at top, #3A3F4B 0%, #1E222A 100%)',
                  boxShadow: isLampOn ? '0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(255, 215, 0, 0.3)' : 'none'
                }}
              />

              {/* Table Surface Reflection */}
              <div
                className="w-48 h-2 rounded-full mt-0.5 filter blur-xs"
                style={{
                  background: isLampOn
                    ? 'radial-gradient(ellipse, rgba(255, 215, 0, 0.4) 0%, transparent 80%)'
                    : 'rgba(0,0,0,0.6)'
                }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center text-xs text-paper-300 border-t border-ink-800/60">
        <div>&copy; 2026 RecruitPulse Intelligence System &bull; LangGraph Autonomous Agents</div>
        <div className="font-mono text-[11px] text-amber-brand flex items-center gap-2 mt-2 sm:mt-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> System Online &bull; Zero Bias Engine
        </div>
      </footer>
    </div>
  );
};
