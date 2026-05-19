import { useEffect, useState } from "react";
import { Shield, Lock, Activity, FileCheck, CheckCircle2 } from "lucide-react";

export function HeroGraphic() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full max-w-[560px] h-[460px] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xl mx-auto font-sans">
      <style>{`
        @keyframes cr360-orbit {
          from { transform: rotate(0deg) translateX(160px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(160px) rotate(-360deg); }
        }
        @keyframes cr360-orbit-reverse {
          from { transform: rotate(360deg) translateX(210px) rotate(-360deg); }
          to { transform: rotate(0deg) translateX(210px) rotate(0deg); }
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
        .cr360-orbit-1 { animation: cr360-orbit 15s linear infinite; }
        .cr360-orbit-2 { animation: cr360-orbit 20s linear infinite; animation-delay: -5s; }
        .cr360-orbit-3 { animation: cr360-orbit 18s linear infinite; animation-delay: -10s; }
        .cr360-orbit-rev-1 { animation: cr360-orbit-reverse 25s linear infinite; }
        .cr360-orbit-rev-2 { animation: cr360-orbit-reverse 22s linear infinite; animation-delay: -8s; }
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
          cx="280" cy="230" r="160"
          stroke="rgba(0,212,255,0.15)"
          strokeWidth="1"
          strokeDasharray="10,10"
          className="cr360-circuit-path"
        />
        <circle
          cx="280" cy="230" r="210"
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
        <Shield className="w-12 h-12 text-cyan-400 mb-1" strokeWidth={1.5} />
        <span className="text-xl font-bold text-white tracking-wider" style={{ textShadow: "0 0 10px rgba(0,212,255,0.7)" }}>
          360
        </span>
      </div>

      {/* Orbiting satellites container */}
      <div
        className={"absolute top-1/2 left-1/2 transition-opacity duration-700 delay-300 " + (mounted ? "opacity-100" : "opacity-0")}
        style={{ transform: "translate(-50%,-50%)" }}
      >
        {/* Inner orbit — NIS2 */}
        <div className="absolute cr360-orbit-1">
          <div
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-slate-900 border border-cyan-500"
            style={{ transform: "translate(-50%,-50%)", boxShadow: "0 0 12px rgba(0,212,255,0.3)" }}
          >
            <Lock className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-cyan-300 mt-0.5">NIS2</span>
          </div>
        </div>

        {/* Inner orbit — CIR */}
        <div className="absolute cr360-orbit-2">
          <div
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-slate-900 border border-cyan-400"
            style={{ transform: "translate(-50%,-50%)", boxShadow: "0 0 12px rgba(0,212,255,0.25)" }}
          >
            <Activity className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-cyan-300 mt-0.5">CIR</span>
          </div>
        </div>

        {/* Inner orbit — AUDIT */}
        <div className="absolute cr360-orbit-3">
          <div
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-slate-900 border border-indigo-400"
            style={{ transform: "translate(-50%,-50%)", boxShadow: "0 0 10px rgba(99,102,241,0.25)" }}
          >
            <FileCheck className="w-4 h-4 text-indigo-400" strokeWidth={1.5} />
            <span className="text-[9px] font-bold text-indigo-300 mt-0.5">AUDIT</span>
          </div>
        </div>

        {/* Outer orbit — EU */}
        <div className="absolute cr360-orbit-rev-1">
          <div
            className="flex items-center justify-center gap-1 w-16 h-8 rounded-full bg-slate-900 border border-blue-500 px-2"
            style={{ transform: "translate(-50%,-50%)", boxShadow: "0 0 10px rgba(59,130,246,0.25)" }}
          >
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-bold text-blue-300">EU</span>
          </div>
        </div>

        {/* Outer orbit — check */}
        <div className="absolute cr360-orbit-rev-2">
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

      {/* Status bar — bottom */}
      <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
        <div className="text-left font-mono text-[10px] text-cyan-500/60 uppercase tracking-widest">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            System Secure
          </div>
          <div className="text-cyan-700/60">v2.0 · EU Certified</div>
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
