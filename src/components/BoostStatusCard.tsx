import React from 'react';
import {
  Zap,
  Clock,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Gamepad2,
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { haptics } from '../utils/haptics.ts';
import { resolveNumericFps } from '../utils/gamingEngine.ts';

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
}

export const BoostStatusCard: React.FC = () => {
  const {
    state,
    masterBoostActive,
    superBoost,
    firewallState,
    deviceCapabilities,
    activeGame,
    appsList,
    setIsBoostDetailsOpen,
    setCurrentScreen,
  } = useBooster();

  const blockedCount = appsList.filter((a) => a.isBlocked).length;
  const gameName =
    activeGame?.name ||
    superBoost.selectedGameName ||
    firewallState.protectedGameName ||
    'Global Game Profile';

  const remainingSec = Math.max(0, state.boostTimeRemainingSec || 0);
  const resolvedFps = resolveNumericFps(state.activeFps, state.maxHardwareHz);
  const sessionClockText = remainingSec > 0 ? formatClock(remainingSec) : '00:00';

  const vpnStateLabel = firewallState.isNativeAndroid
    ? firewallState.enabled
      ? `VPN L#${firewallState.vpnLayer || 1}`
      : 'READY'
    : firewallState.enabled
    ? `FW L#${firewallState.firewallLayer || 1}`
    : 'READY';

  const handleAction = () => {
    haptics.impactLight();
    sound.playClick();
    if (masterBoostActive) {
      setIsBoostDetailsOpen(true);
    } else {
      setCurrentScreen('home');
    }
  };

  return (
    <section
      aria-label="Boost Status Summary"
      className={`rounded-2xl border p-3.5 space-y-3 transition-colors ${
        masterBoostActive
          ? 'bg-gradient-to-br from-[#071a3a] via-[#06132b] to-[#040c1f] border-emerald-500/60 shadow-[0_0_24px_rgba(16,185,129,0.18)]'
          : 'bg-[#071129]/95 border-cyan-900/60'
      }`}
    >
      {/* Top Row: Boost State + Game Target + Action */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
              masterBoostActive
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
            }`}
          >
            {masterBoostActive ? <Zap className="w-4 h-4 fill-emerald-300/30" /> : <Gamepad2 className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="font-orbitron font-extrabold text-xs text-white uppercase tracking-wider">
                Boost Status
              </h2>
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                  masterBoostActive
                    ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                {masterBoostActive ? 'BOOST ON' : 'READY'}
              </span>
            </div>
            <p className="text-[10px] font-mono text-cyan-300 truncate mt-0.5">
              {gameName} · {state.activeProfile.replace(/_/g, ' ')} · {resolvedFps} FPS
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAction}
          className="min-h-[36px] px-2.5 py-1 rounded-xl bg-[#040c1e] border border-cyan-500/45 hover:border-cyan-300 text-[10px] font-orbitron font-bold text-cyan-200 flex items-center space-x-1 cursor-pointer shrink-0"
        >
          <span>{masterBoostActive ? 'Details' : 'Boost'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Live Telemetry Metrics Row */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-cyan-950/80 font-mono">
        {/* Session Time */}
        <div className="bg-[#040c1f] border border-cyan-950 rounded-xl p-2 min-w-0">
          <div className="flex items-center space-x-1 text-[9px] text-slate-400 uppercase">
            <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="truncate">Session</span>
          </div>
          <div className="font-orbitron font-extrabold text-xs text-white mt-1 tabular-nums truncate">
            {sessionClockText}
          </div>
          <div className="text-[9px] text-cyan-300 truncate tabular-nums">
            {masterBoostActive
              ? 'Countdown Left'
              : remainingSec > 0
              ? 'Countdown Left'
              : 'Boost OFF · 00:00'}
          </div>
        </div>

        {/* CPU / RAM Status */}
        <div className="bg-[#040c1f] border border-cyan-950 rounded-xl p-2 min-w-0">
          <div className="flex items-center space-x-1 text-[9px] text-slate-400 uppercase">
            <Cpu className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">CPU / RAM</span>
          </div>
          <div className="font-orbitron font-extrabold text-xs text-emerald-300 mt-1 tabular-nums truncate">
            {state.ramUsagePercent}% RAM
          </div>
          <div className="text-[9px] text-slate-300 truncate tabular-nums">
            {deviceCapabilities.cpuCores}c · {state.ramUsedGb}/{state.totalRamGb}G
          </div>
        </div>

        {/* VPN Firewall Connection */}
        <div className="bg-[#040c1f] border border-cyan-950 rounded-xl p-2 min-w-0">
          <div className="flex items-center space-x-1 text-[9px] text-slate-400 uppercase">
            {firewallState.conflictDetected || firewallState.connectionState === 'ERROR' ? (
              <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />
            ) : (
              <ShieldCheck
                className={`w-3 h-3 shrink-0 ${
                  firewallState.enabled ? 'text-emerald-400' : 'text-slate-400'
                }`}
              />
            )}
            <span className="truncate">VPN FW</span>
          </div>
          <div
            className={`font-orbitron font-extrabold text-xs mt-1 truncate ${
              firewallState.conflictDetected || firewallState.connectionState === 'ERROR'
                ? 'text-red-300'
                : firewallState.enabled
                ? 'text-emerald-300'
                : 'text-slate-300'
            }`}
          >
            {vpnStateLabel}
          </div>
          <div className="text-[9px] text-slate-300 truncate tabular-nums">
            {firewallState.isNativeAndroid && firewallState.persistentServiceRunning
              ? `HB #${firewallState.heartbeatCount ?? 0} · ${blockedCount} Apps`
              : `${blockedCount} Rules`}
          </div>
        </div>
      </div>
    </section>
  );
};
