import { useEffect, useState } from "react";
import { Shield, Lock, Activity, FileCheck, CheckCircle2, Landmark } from "lucide-react";

export function HeroGraphic() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full max-w-[560px] h-[460px] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xl mx-auto font-sans">
      <style>{`
        @keyframes cr360-orbit-inner {
          from { transform: rotate(0deg) translateX(150px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(150px) rotate(-360deg); }
        }
        @keyframes cr360-orbit-mid {
          from { transform: rotate(0deg) translateX(195px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(195px) rotate(-360deg); }
        }
        @keyframes cr360-orbit-outer-rev {
          from { transform: rotate(360deg) translateX(230px) rotate(-360deg); }
          to { transform: rotate(0deg) translateX(230px) rotate(0deg); }
        }
        @keyframes cr360-pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 15px rgba(0, 212, 255, 0.5)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 30px rgba(0, 212, 255, 0.8)); transform: scale(1.02); }
        }
        @keyframes cr360-dash {
          to { stroke-dashoffset: -1000; }
        }
        @keyframes cr360-bar {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
        .cr360-orbit-nis2 { animation: cr360-orbit-inner 18s linear infinite; }
        .cr360-orbit-cir { animation: cr360-orbit-inner 18s linear infinite; animation-delay: -6s; }
        .cr360-orbit-dora { animation: cr360-orbit-inner 18s linear infinite; animation-delay: -12s; }
        .cr360-orbit-audit { animation: cr360-orbit-mid 22s linear infinite; animation-delay: -3s; }
        .cr360-orbit-art21 { animation: cr360-orbit-mid 22s linear infinite; animation-delay: -14s; }
        .cr360-orbit-eu { animation: cr360-orbit-outer-rev 28s linear infinite; }
        .cr360-orbit-check { animation: cr360-orbit-outer-rev 28s linear infinite; animation-delay: -14s; }
        .cr360-pulse-shield { animation: cr360-pulse-glow 4s ease-in-out infinite; }
        .cr360-circuit-path { stroke-dasharray: 10, 10; animation: cr360-dash 30s linear infinite; }
      `}</style>

      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, transparent 0%, #020617 70%), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 30px 30px, 30px 30px",
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,212,255,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Orbit rings (SVG so they stay perfectly circular) */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 560 460" fill="none">
        <circle
          cx="280" cy="230" r="150"
          stroke="rgba(0,212,255,0.18)"
          strokeWidth="1"
          strokeDasharray="10,10"
          className="cr360-circuit-path"
        />
        <circle
          cx="280" cy="230" r="195"
          stroke="rgba(245,158,11,0.14)"
          strokeWidth="1"
          strokeDasharray="6,12"
          className="cr360-circuit-path"
        />
        <circle
          cx="280" cy="230" r="230"
          stroke="rgba(59,130,246,0.12)"
          strokeWidth="1"
          strokeDasharray="8,14"
          className="cr360-circuit-path"
        />
      </svg>

      {/* Central shield */}
      <div
        className={"relative z-10 flex flex-col items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/50 cr360-pulse-shield transition-opacity duration-1000 " + (mounted ? "opacity-100" : "opacity-0")}
      >
        <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-xl" />
        <Shield className="w-11 h-11 text-cyan-400 mb-0.5" strokeWidth={1.5} />
        <span className="text-xl font-bold text-white tracking-wider leading-none" style={{ textShadow: "0 0 10px rgba(0,212,255,0.7)" }}>
          360
        </span>
        <span className="text-[8px] font-semibold text-cyan-300/80 tracking-[0.18em] uppercase mt-0.5">
          Cyber Resilience
        </span>
      </div>

      {/* Orbiting satellites container */}
      <div
        className={"absolute top-1/2 left-1/2 transition-opacity duration-700 delay-300 " + (mounted ? "opacity-100" : "opacity-0")}
        style={{ transform: "translate(-50%,-50%)" }}
      >
        {/* Inner orbit — NIS2 (blue) */}
        <div className="absolute cr360-orbit-nis2">
          <div
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-slate-900 border border-cyan-500"
            style={{ transform: "translate(-50%,-50%)", boxShadow: "0 0 14px rgba(0,212,255,0.35)" }}
          >
            <Lock className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-cyan-300 mt-0.5">NIS2</span>
          </div>
        </div>

        {/* Inner orbit — CIR (violet) */}
        <div className="absolute cr360-orbit-cir">
          <div
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-slate-900 border border-violet-400"
            style={{ transform: "translate(-50%,-50%)", boxShadow: "0 0 14px rgba(167,139,250,0.3)" }}
          >
            <Activity className="w-5 h-5 text-violet-300" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-violet-200 mt-0.5">CIR</span>
          </div>
        </div>

        {/* Inner orbit — DORA (amber, financial-sector accent) */}
        <div className="absolute cr360-orbit-dora">
          <div
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-slate-900 border border-amber-400"
            style={{ transform: "translate(-50%,-50%)", boxShadow: "0 0 14px rgba(251,191,36,0.35)" }}
          >
            <Landmark className="w-5 h-5 text-amber-300" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-amber-200 mt-0.5">DORA</span>
          </div>
        </div>

        {/* Mid orbit — AUDIT */}
        <div className="absolute cr360-orbit-audit">
          <div
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-slate-900 border border-indigo-400"
            style={{ transform: "translate(-50%,-50%)", boxShadow: "0 0 10px rgba(99,102,241,0.25)" }}
          >
            <FileCheck className="w-4 h-4 text-indigo-300" strokeWidth={1.5} />
            <span className="text-[9px] font-bold text-indigo-200 mt-0.5">AUDIT</span>
          </div>
        </div>

        {/* Mid orbit — Art.21 risk register */}
        <div className="absolute cr360-orbit-art21">
          <div
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-slate-900 border border-rose-400/70"
            style={{ transform: "translate(-50%,-50%)", boxShadow: "0 0 10px rgba(251,113,133,0.25)" }}
          >
            <Shield className="w-4 h-4 text-rose-300" strokeWidth={1.5} />
            <span className="text-[8px] font-bold text-rose-200 mt-0.5 leading-none">ART.21</span>
          </div>
        </div>

        {/* Outer orbit — EU badge */}
        <div className="absolute cr360-orbit-eu">
          <div
            className="flex items-center justify-center gap-1 w-16 h-8 rounded-full bg-slate-900 border border-blue-500 px-2"
            style={{ transform: "translate(-50%,-50%)", boxShadow: "0 0 10px rgba(59,130,246,0.25)" }}
          >
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-bold text-blue-300">EU</span>
          </div>
        </div>

        {/* Outer orbit — verified check */}
        <div className="absolute cr360-orbit-check">
          <div
            className="flex items-center justify-center w-11 h-11 rounded-full bg-slate-900 border border-emerald-500/60"
            style={{ transform: "translate(-50%,-50%)", boxShadow: "0 0 10px rgba(16,185,129,0.2)" }}
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* EU stars — top right */}
      <div className="absolute top-5 right-5 flex gap-1 opacity-35">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className="w-3.5 h-3.5 text-blue-400 fill-current" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>

      {/* Top-left framework tags */}
      <div className="absolute top-5 left-5 flex flex-col gap-1 font-mono text-[9px] tracking-[0.15em] uppercase">
        <div className="flex items-center gap-1.5 text-cyan-400/80">
          <span className="w-1 h-1 rounded-full bg-cyan-400" />
          NIS2 · 2022/2555
        </div>
        <div className="flex items-center gap-1.5 text-violet-300/80">
          <span className="w-1 h-1 rounded-full bg-violet-400" />
          CIR · 2024/2690
        </div>
        <div className="flex items-center gap-1.5 text-amber-300/80">
          <span className="w-1 h-1 rounded-full bg-amber-400" />
          DORA · 2022/2554
        </div>
      </div>

      {/* Status bar — bottom */}
      <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
        <div className="text-left font-mono text-[10px] text-cyan-500/60 uppercase tracking-widest">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            System Secure
          </div>
          <div className="text-cyan-700/60">3 Frameworks · EU Aligned</div>
        </div>
        <div className="flex gap-1 h-7 items-end">
          {[40, 70, 50, 90, 60, 80, 45].map((h, i) => (
            <div
              key={i}
              className="w-1.5 bg-cyan-500/50 rounded-t-sm"
              style={{
                height: h + "%",
                animation: "cr360-bar " + (2 + i * 0.2) + "s infinite alternate",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
