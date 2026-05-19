import React, { useEffect, useState } from 'react';
import { Shield, Lock, Activity, Server, FileCheck, CheckCircle2 } from 'lucide-react';

export function HeroGraphic() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full max-w-[600px] h-[500px] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xl mx-auto font-sans">
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(160px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(160px) rotate(-360deg); }
        }
        @keyframes orbit-reverse {
          from { transform: rotate(360deg) translateX(220px) rotate(-360deg); }
          to { transform: rotate(0deg) translateX(220px) rotate(0deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 15px rgba(0, 212, 255, 0.5)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 30px rgba(0, 212, 255, 0.8)); transform: scale(1.02); }
        }
        @keyframes dash {
          to { stroke-dashoffset: -1000; }
        }
        .animate-orbit-1 { animation: orbit 15s linear infinite; }
        .animate-orbit-2 { animation: orbit 20s linear infinite; animation-delay: -5s; }
        .animate-orbit-3 { animation: orbit 18s linear infinite; animation-delay: -10s; }
        
        .animate-orbit-rev-1 { animation: orbit-reverse 25s linear infinite; }
        .animate-orbit-rev-2 { animation: orbit-reverse 22s linear infinite; animation-delay: -8s; }
        
        .pulse-shield { animation: pulse-glow 4s ease-in-out infinite; }
        .circuit-path { stroke-dasharray: 10, 10; animation: dash 30s linear infinite; }
        
        .glow-cyan { text-shadow: 0 0 10px rgba(0,212,255,0.7); box-shadow: 0 0 15px rgba(0,212,255,0.3); }
        .glow-blue { text-shadow: 0 0 10px rgba(59,130,246,0.7); box-shadow: 0 0 15px rgba(59,130,246,0.3); }
      `}</style>
      
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20"
           style={{
             backgroundImage: 'radial-gradient(circle at center, transparent 0%, #020617 70%), linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
             backgroundSize: '100% 100%, 30px 30px, 30px 30px',
             backgroundPosition: 'center'
           }}
      />
      
      {/* Center 360 Shield */}
      <div className={"relative z-10 flex flex-col items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/50 pulse-shield transition-opacity duration-1000 " + (mounted ? 'opacity-100' : 'opacity-0')}>
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl" />
        <Shield className="w-12 h-12 text-cyan-400 mb-1" />
        <span className="text-xl font-bold text-white tracking-wider glow-cyan">360</span>
      </div>

      {/* Orbit Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full border border-cyan-500/20 circuit-path opacity-50 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] rounded-full border border-blue-500/20 circuit-path opacity-30 pointer-events-none" />
      
      {/* Satellites */}
      <div className={"absolute top-1/2 left-1/2 transition-opacity duration-1000 delay-300 " + (mounted ? 'opacity-100' : 'opacity-0')}>
        
        {/* Inner Orbit */}
        <div className="absolute animate-orbit-1">
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-slate-900 border border-cyan-500 glow-cyan -translate-x-1/2 -translate-y-1/2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <span className="text-[10px] font-bold text-cyan-300 mt-1">NIS2</span>
          </div>
        </div>
        
        <div className="absolute animate-orbit-2">
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-slate-900 border border-cyan-400 glow-cyan -translate-x-1/2 -translate-y-1/2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span className="text-[10px] font-bold text-cyan-300 mt-1">CIR</span>
          </div>
        </div>

        <div className="absolute animate-orbit-3">
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-slate-900 border border-indigo-400 glow-blue -translate-x-1/2 -translate-y-1/2">
            <FileCheck className="w-5 h-5 text-indigo-400" />
            <span className="text-[9px] font-bold text-indigo-300 mt-1">AUDIT</span>
          </div>
        </div>

        {/* Outer Orbit */}
        <div className="absolute animate-orbit-rev-1">
          <div className="flex items-center justify-center gap-1 w-16 h-8 rounded-full bg-slate-900 border border-blue-500 glow-blue -translate-x-1/2 -translate-y-1/2 px-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-bold text-blue-300">EU</span>
          </div>
        </div>

        <div className="absolute animate-orbit-rev-2">
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-slate-900 border border-emerald-500/50 -translate-x-1/2 -translate-y-1/2 bg-opacity-80 backdrop-blur-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        
      </div>
      
      {/* EU Stars Element (subtle) */}
      <div className="absolute top-6 right-6 flex gap-1 opacity-40">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className="w-4 h-4 text-blue-400 fill-current" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      
      {/* Decorative lines/UI elements */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
        <div className="text-left font-mono text-xs text-cyan-500/50 uppercase tracking-widest">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            System Secure
          </div>
          <div>v2.0.4.EU</div>
        </div>
        <div className="flex gap-1 h-8 items-end">
          {[40, 70, 50, 90, 60, 80, 45].map((h, i) => (
            <div key={i} className="w-1.5 bg-cyan-500/40 rounded-t-sm" style={{ height: h + '%', animation: 'pulse-glow ' + (2 + i*0.2) + 's infinite alternate' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default HeroGraphic;