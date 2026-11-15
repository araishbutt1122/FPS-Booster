import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  Flame, 
  Activity, 
  Wifi, 
  Cpu, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Square,
  Smartphone,
  Globe2,
  RefreshCw,
  Signal,
  Radio,
  Server,
  Check
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';

export const GamingDashboard: React.FC = () => {
  const { 
    state, 
    stopGamingMode, 
    cleanRam, 
    activeGame, 
    logs,
    setSnackBarMessage,
    serverRegions,
    selectedRegionId,
    activeRegion,
    isProbing,
    lastProbedTime,
    runPingProbe,
    selectPingRegion
  } = useBooster();

  const [sessionSeconds, setSessionSeconds] = useState(747); // 00:12:27 default
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanedToast, setCleanedToast] = useState<string | null>(null);

  // Session timer counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCleanRam = () => {
    setIsCleaning(true);
    sound.playBoost();
    const { freedMb } = cleanRam();
    setCleanedToast(`Cleared ${freedMb} MB RAM!`);

    setTimeout(() => {
      setIsCleaning(false);
    }, 1000);

    setTimeout(() => {
      setCleanedToast(null);
    }, 3000);
  };

  const handleManualPingProbe = async () => {
    sound.playClick();
    await runPingProbe();
    sound.playSuccess();
  };

  // Realistic Latency Thresholds:
  // < 80ms = GOOD, 80-200ms = MODERATE, > 200ms = HIGH
  const getPingQuality = (ms: number): { label: string; textColor: string; badgeClass: string } => {
    if (ms < 80) {
      return {
        label: 'GOOD',
        textColor: 'text-emerald-400',
        badgeClass: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40',
      };
    }
    if (ms <= 200) {
      return {
        label: 'MODERATE',
        textColor: 'text-amber-400',
        badgeClass: 'text-amber-400 border-amber-500/50 bg-amber-950/40',
      };
    }
    return {
      label: 'HIGH',
      textColor: 'text-red-400',
      badgeClass: 'text-red-400 border-red-500/50 bg-red-950/40',
    };
  };

  const activePingQuality = getPingQuality(activeRegion.currentPingMs);
  const isHighPing = activeRegion.currentPingMs > 200;

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-1 space-y-4">
      {/* Toast */}
      {cleanedToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 border border-emerald-400 text-emerald-200 px-5 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{cleanedToast}</span>
        </div>
      )}

      {/* Top Game / Boost Profile Status Header */}
      <div className="p-3 rounded-2xl bg-[#071333] border border-cyan-900/60 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-orbitron font-bold text-xs text-white break-words">
              {activeGame ? activeGame.name : 'High Priority Boost'}
            </h3>
            <p className="text-[10px] text-cyan-400 font-mono break-words">
              {activeGame ? activeGame.packageName : 'All Games Whitelisted'}
            </p>
          </div>
        </div>

        <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-700/60 px-2.5 py-0.5 rounded-full font-mono font-bold whitespace-nowrap shrink-0">
          RUNNING
        </span>
      </div>

      {/* Center: Circular Gaming Timer 00:12:27 "Gaming..." */}
      <div className="flex flex-col items-center justify-center py-2 relative">
        <div className="relative flex items-center justify-center">
          {/* Neon Ring */}
          <div className="w-48 h-48 rounded-full border-4 border-cyan-500/30 flex items-center justify-center relative shadow-[0_0_35px_rgba(0,191,255,0.4)]">
            {/* Spinning accent dash */}
            <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent animate-[spin_4s_linear_infinite]" />
            
            <div className="flex flex-col items-center text-center">
              <span className="text-[11px] text-cyan-400 font-orbitron font-bold tracking-widest uppercase mb-1">
                Gaming...
              </span>
              <span className="font-orbitron font-black text-2xl text-white tracking-wider drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]">
                {formatTimer(sessionSeconds)}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>FIREWALL LOCKED</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* FPS Card */}
        <div className="bg-[#071129]/90 border border-cyan-900/60 rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-mono block">FPS MONITOR</span>
            <div className="mt-0.5">
              <span className="font-orbitron font-extrabold text-xl text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                {state.currentFps} FPS
              </span>
            </div>
            {isHighPing ? (
              <span className="text-[10px] text-red-400 font-mono font-bold block mt-1 leading-tight">
                High Ping Detected - Boost Recommended
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-mono block mt-1 leading-tight">
                Optimizing for {state.activeFps} FPS
              </span>
            )}
          </div>
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* RAM Card with Quick Clean */}
        <div 
          onClick={handleCleanRam}
          className="bg-[#071129]/90 border border-cyan-900/60 hover:border-emerald-500/60 transition-all rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-2 cursor-pointer"
          title="Tap to Clean RAM"
        >
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-mono block">RAM USAGE (Estimated)</span>
            <div className="flex items-baseline flex-wrap gap-1 mt-0.5">
              <span className="font-orbitron font-extrabold text-xl text-emerald-400">
                {state.ramUsagePercent}%
              </span>
              <span className="text-[10px] text-slate-400 font-mono">({state.ramUsedGb} GB)</span>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono block mt-1 flex items-center space-x-1">
              <RotateCcw className={`w-2.5 h-2.5 shrink-0 ${isCleaning ? 'animate-spin' : ''}`} />
              <span>Tap to Clean</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        {/* Temperature Card */}
        <div className="bg-[#071129]/90 border border-cyan-900/60 rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-mono block">DEVICE TEMP (Estimated)</span>
            <span className="font-orbitron font-extrabold text-xl text-amber-400 block mt-0.5 leading-tight">
              {state.temperatureC}°C
            </span>
            <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">
              Battery: {state.batteryLevel ?? 88}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              Thermal Monitor ON
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* Ping Card (Synced with active lowest-ping region) */}
        <div className="bg-[#071129]/90 border border-cyan-900/60 rounded-2xl p-3.5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-mono block">NETWORK LATENCY</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="font-orbitron font-extrabold text-2xl text-cyan-400">
                {activeRegion.currentPingMs}ms
              </span>
              <span className={`text-[10px] font-mono font-bold ${activePingQuality.textColor}`}>
                {activePingQuality.label}
              </span>
            </div>
            <span className="text-[10px] text-cyan-300 font-mono block mt-1">
              Route: {activeRegion.name.split(' ')[0]} (±{activeRegion.jitterMs}ms)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Wifi className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* REAL-TIME PING MONITOR SECTION (NEW REAL NETWORK LATENCY TEST PROBE) */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#041029] via-[#051433] to-[#020a1f] border-2 border-cyan-500/60 shadow-xl shadow-cyan-950/60 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-cyan-900/60">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-cyan-400 shadow-sm">
              <Globe2 className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h4 className="font-orbitron font-extrabold text-xs text-white uppercase tracking-wider flex items-center space-x-1.5">
                <span>REAL-TIME PING MONITOR</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </h4>
              <p className="text-[10px] text-cyan-300/80 font-mono">
                Live Server Latency Probe • {lastProbedTime}
              </p>
            </div>
          </div>

          {/* Test Ping Now Button */}
          <button
            type="button"
            onClick={handleManualPingProbe}
            disabled={isProbing}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold flex items-center space-x-1 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Probe Latency Across All Server Regions"
          >
            <RefreshCw className={`w-3 h-3 ${isProbing ? 'animate-spin' : ''}`} />
            <span>{isProbing ? 'Probing...' : 'Test Ping'}</span>
          </button>
        </div>

        {/* Server Regions List */}
        <div className="space-y-2">
          {serverRegions.map((region) => {
            const isSelected = region.id === selectedRegionId;
            const quality = getPingQuality(region.currentPingMs);

            return (
              <div
                key={region.id}
                onClick={() => {
                  sound.playClick();
                  selectPingRegion(region.id);
                  setSnackBarMessage(`Active Route: ${region.name} (${region.currentPingMs}ms)`);
                }}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#061838] border-cyan-400 shadow-[0_0_15px_rgba(0,191,255,0.35)]'
                    : 'bg-[#030c1f] border-slate-800/80 hover:border-cyan-800/60'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                    isSelected ? 'bg-cyan-400 text-black border-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}>
                    {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Server className="w-3.5 h-3.5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <h5 className="font-orbitron font-bold text-xs text-white leading-tight break-words">
                        {region.name}
                      </h5>
                      {isSelected && (
                        <span className="text-[8px] bg-cyan-950 text-cyan-300 border border-cyan-500/60 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                          ACTIVE ROUTE
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono break-words mt-0.5">
                      {region.sublabel}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="leading-tight">
                    <span className={`font-orbitron font-extrabold text-xs px-2 py-0.5 rounded-lg border inline-block whitespace-nowrap ${quality.badgeClass}`}>
                      {region.currentPingMs} ms
                    </span>
                    <span className={`text-[9px] font-mono font-bold block mt-0.5 whitespace-nowrap ${quality.textColor}`}>
                      {quality.label} • ±{region.jitterMs}ms
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Route Status Summary */}
        <div className="p-2.5 rounded-xl bg-[#020817] border border-cyan-950 flex items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center space-x-2 text-slate-300 min-w-0">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
            <span className="break-words">Optimal Relay: <strong className="text-cyan-300">{activeRegion.name}</strong></span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded whitespace-nowrap shrink-0">
            0.0% LOSS
          </span>
        </div>
      </div>

      {/* Button: Performance Optimized! (Green Glowing) */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-center shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center justify-center space-x-2">
        <CheckCircle2 className="w-5 h-5 text-white" />
        <span className="font-orbitron font-black text-sm text-white tracking-wider uppercase">
          Performance Optimized!
        </span>
      </div>

      {/* Button: Stop Gaming Mode */}
      <button
        onClick={stopGamingMode}
        className="w-full py-3.5 rounded-2xl bg-[#1f0814] border border-red-500/60 text-red-300 hover:text-white hover:bg-red-950/60 font-orbitron font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg active:scale-98"
      >
        <Square className="w-4 h-4 fill-current" />
        <span>Stop Gaming Mode</span>
      </button>

      {/* Live System Process Logs */}
      <div className="bg-[#050b1a] border border-cyan-950 rounded-2xl p-3 font-mono text-[10px] space-y-1">
        <span className="text-slate-400 font-bold block uppercase tracking-wider mb-1">
          ActivityManager Live Console
        </span>
        <div className="max-h-24 overflow-y-auto space-y-1 text-slate-300">
          {logs.slice(0, 6).map((log, i) => (
            <div key={i} className="flex items-start space-x-1.5">
              <span className="text-cyan-500">&gt;</span>
              <span className="truncate">{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
