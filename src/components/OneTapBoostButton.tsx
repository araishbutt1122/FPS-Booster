import React, { useEffect, useState } from 'react';
import {
  Zap,
  ShieldCheck,
  Gamepad2,
  Square,
  CheckCircle2,
  Activity,
  Cpu,
  Wifi,
  Flame,
  AlertTriangle,
  Clock,
  BatteryCharging,
  Info,
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { haptics } from '../utils/haptics.ts';
import { resolveNumericFps } from '../utils/gamingEngine.ts';
import { BoostDetailsModal, PermissionFlowModal } from './BoostDetailsModal.tsx';

const SUPER_BOOST_STAGES = [
  'Permissions Check',
  'Game Detection',
  'RAM Staging',
  'VPN Engine',
  'Filter Profile',
  'Game Whitelist',
  'Gaming Engine',
  'FPS Monitor',
  'Net Stability',
  'Thermal Guard',
];

export const OneTapBoostButton: React.FC = () => {
  const {
    state,
    gamesList,
    appsList,
    firewallState,
    masterBoostActive,
    superBoost,
    selectedSuperBoostGamePkg,
    setSelectedSuperBoostGamePkg,
    handleToggleBoost,
    setIsBoostDetailsOpen,
  } = useBooster();

  const selectedGame =
    gamesList.find((g) => g.packageName === selectedSuperBoostGamePkg) || gamesList[0];

  const isActivating = superBoost.status === 'activating';
  const isStopping = superBoost.status === 'stopping';
  const isActive = masterBoostActive;

  const blockedCount = appsList.filter((a) => a.isBlocked).length;
  const resolvedFps = resolveNumericFps(state.activeFps, state.maxHardwareHz);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePrimaryTap = () => {
    if (isActivating || isStopping) return;
    handleToggleBoost(selectedGame);
  };

  const progressPct = isActivating
    ? Math.min(100, Math.max(8, Math.round((superBoost.currentStepIndex / 10) * 100)))
    : isActive
    ? 100
    : 0;

  const vpnLayer = firewallState.vpnLayer || 1;
  const fwLayer = firewallState.firewallLayer || 1;

  const vpnDetailLabel = firewallState.isNativeAndroid
    ? firewallState.hasVpnPermission
      ? firewallState.enabled
        ? `VpnService (${firewallState.connectionState}) · L#${vpnLayer}/1000`
        : `VpnService Ready · 1000 Layers`
      : 'VPN Permission Required'
    : isActive
    ? `Local Filter Engine · L#${vpnLayer}/1000`
    : 'Local Filter Rules Ready · 1000 Layers';

  const remainingSec = Math.max(0, state.boostTimeRemainingSec || 0);
  const timerDisplay =
    remainingSec > 0
      ? `${formatDuration(remainingSec)} Left`
      : 'Watch Ad to Start';

  return (
    <section
      aria-label="Master Boost On Off Control"
      className="w-full rounded-3xl bg-gradient-to-b from-[#071636]/95 via-[#050f26]/95 to-[#03091a] border border-cyan-500/45 p-4 shadow-[0_0_32px_rgba(0,191,255,0.2)] space-y-3.5"
    >
      {/* TOP: Target Game Selector + Integrated Boost Details Card */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 bg-[#040b1d] border border-cyan-900/70 rounded-2xl px-3 py-2">
          <div className="flex items-center space-x-2 min-w-0">
            <Gamepad2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] font-mono text-slate-400 uppercase block leading-none">
                Target Game (Whitelisted)
              </span>
              <select
                value={selectedGame.packageName}
                disabled={isActivating || isActive}
                onChange={(e) => {
                  haptics.selection();
                  sound.playClick();
                  setSelectedSuperBoostGamePkg(e.target.value);
                }}
                aria-label="Select Target Game for Super Boost"
                className="bg-transparent text-xs font-orbitron font-bold text-white focus:outline-none cursor-pointer disabled:opacity-80 mt-0.5 max-w-[190px] truncate"
              >
                {gamesList.map((g) => (
                  <option key={g.id} value={g.packageName} className="bg-[#050A1A] text-white">
                    {g.name} ({g.genre}){g.isInstalled ? ' (Installed)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold text-emerald-300 tabular-nums shrink-0">
            {blockedCount}/{appsList.length} Rules
          </span>
        </div>

        {/* TOP: Boost Details Summary (VPN Layer, Firewall Layer, Blocking Rules, Profile & Timer) */}
        <div className="bg-[#040c1f]/95 border border-cyan-900/70 rounded-2xl p-2.5 space-y-1.5 text-[10px] font-mono">
          <div className="flex items-center justify-between pb-1 border-b border-cyan-950">
            <span className="font-orbitron font-bold text-cyan-300 uppercase tracking-wider">
              Boost Details
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                isActive
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                  : 'bg-cyan-950/70 text-cyan-300 border border-cyan-700/60'
              }`}
            >
              {isActive ? 'SESSION ACTIVE' : 'READY'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400">Game Profile:</span>
            <span className="text-cyan-200 font-bold truncate">
              {state.activeProfile.replace('_', ' ')} ({resolvedFps} FPS)
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400">Local VPN (1000 Layers):</span>
            <span
              className={`font-bold truncate ${
                firewallState.isNativeAndroid
                  ? firewallState.enabled
                    ? 'text-emerald-300'
                    : 'text-amber-300'
                  : isActive
                  ? 'text-cyan-300'
                  : 'text-slate-300'
              }`}
            >
              {vpnDetailLabel}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400">Firewall Protection:</span>
            <span className="text-slate-200 font-bold tabular-nums truncate">
              {isActive
                ? `FW L#${fwLayer}/1000 · ${blockedCount} Apps · DNS ${firewallState.dnsFilterEnabled ? 'ON' : 'OFF'}`
                : `${blockedCount} Rules Staged · 2s Watchdog`}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400">Boost Countdown:</span>
            <span className="text-cyan-300 font-bold tabular-nums">
              {remainingSec > 0
                ? `${formatDuration(remainingSec)} Left`
                : 'Watch Ad to Start'}
            </span>
          </div>

          {state.batterySaverMode && (
            <div className="flex items-center justify-between gap-2 text-amber-300 pt-0.5">
              <span className="flex items-center space-x-1">
                <BatteryCharging className="w-3 h-3" />
                <span>Battery Saver:</span>
              </span>
              <span className="font-bold">ON (Throttled + Dimmed)</span>
            </div>
          )}

          {isActive && (
            <button
              type="button"
              onClick={() => {
                haptics.impactLight();
                sound.playClick();
                setIsBoostDetailsOpen(true);
              }}
              className="w-full min-h-[38px] mt-1.5 py-1.5 px-3 rounded-xl bg-cyan-950/70 border border-cyan-500/45 hover:border-cyan-300 text-cyan-200 font-orbitron font-bold text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>View Full Boost Details</span>
            </button>
          )}
        </div>
      </div>

      {/* MIDDLE: High-Energy Neon Master Ring + Single Master BOOST ON / BOOST OFF Control */}
      <div className="flex flex-col items-center justify-center py-1 relative">
        <div className="relative flex items-center justify-center">
          <div
            className={`absolute w-48 h-48 rounded-full border transition-all duration-300 ${
              isActivating
                ? 'border-cyan-300/80 scale-105 animate-ping'
                : isActive
                ? 'border-emerald-400/50 shadow-[0_0_45px_rgba(16,185,129,0.45)] animate-pulse'
                : 'border-cyan-500/30 animate-pulse'
            }`}
          />

          <div
            className={`absolute w-44 h-44 rounded-full border-2 border-dashed transition-colors ${
              isActivating
                ? 'border-cyan-300 animate-[spin_1.4s_linear_infinite]'
                : isActive
                ? 'border-emerald-400/60 animate-[spin_5s_linear_infinite]'
                : 'border-cyan-400/35 animate-[spin_14s_linear_infinite]'
            }`}
          />

          <svg
            viewBox="0 0 180 180"
            className="absolute w-44 h-44 -rotate-90 pointer-events-none"
            aria-hidden="true"
          >
            <circle
              cx="90"
              cy="90"
              r="82"
              fill="none"
              stroke="rgba(14, 165, 233, 0.14)"
              strokeWidth="4"
            />
            {(isActivating || isActive) && (
              <circle
                cx="90"
                cy="90"
                r="82"
                fill="none"
                stroke={isActive ? '#34d399' : '#00e5ff'}
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 82}
                strokeDashoffset={2 * Math.PI * 82 * (1 - progressPct / 100)}
                style={{ transition: 'stroke-dashoffset 180ms ease-out' }}
              />
            )}
          </svg>

          {/* Master Action Circle */}
          <button
            type="button"
            onClick={handlePrimaryTap}
            disabled={isActivating || isStopping}
            className={`w-36 h-36 rounded-full relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 px-3 text-center ${
              isActivating
                ? 'scale-95 bg-gradient-to-b from-[#06284d] via-[#041630] to-[#020a18] border-2 border-cyan-300 shadow-[0_0_55px_rgba(0,229,255,0.95)]'
                : isActive
                ? 'bg-gradient-to-b from-[#2e0918] via-[#1f0612] to-[#120309] border-2 border-red-400 hover:scale-[1.03] active:scale-95 shadow-[0_0_38px_rgba(248,113,113,0.55)]'
                : 'bg-gradient-to-b from-[#0b2048] via-[#05122b] to-[#020917] border-2 border-cyan-400 hover:scale-[1.03] active:scale-95 shadow-[0_0_35px_rgba(0,191,255,0.55)]'
            }`}
          >
            {isActivating ? (
              <>
                <Zap className="w-8 h-8 text-cyan-300 animate-bounce mb-1 fill-cyan-300/30" />
                <span className="font-orbitron font-black text-xs text-white tracking-wider uppercase leading-tight">
                  BOOSTING {progressPct}%
                </span>
                <span className="text-[10px] font-mono text-cyan-300 mt-0.5 tabular-nums">
                  STEP {superBoost.currentStepIndex}/10
                </span>
              </>
            ) : isActive ? (
              <>
                <Square className="w-7 h-7 text-red-300 fill-red-400/80 mb-1" />
                <span className="font-orbitron font-black text-xs text-white tracking-wider uppercase leading-tight">
                  BOOST OFF
                </span>
                <span className="text-[9px] font-mono text-red-200 uppercase">
                  Stop Boost &amp; VPN
                </span>
                <span className="text-[10px] font-mono text-emerald-300 mt-0.5 tabular-nums">
                  {remainingSec > 0 ? `${formatDuration(remainingSec)} Left` : '00:00'} · {resolvedFps} FPS
                </span>
              </>
            ) : (
              <>
                <div className="relative mb-1">
                  <Zap className="w-9 h-9 text-cyan-300 drop-shadow-[0_0_12px_rgba(0,229,255,0.95)] fill-cyan-400/20" />
                  <ShieldCheck className="w-4 h-4 text-emerald-400 absolute -bottom-0.5 -right-2 bg-[#041024] rounded-full" />
                </div>
                <span className="font-orbitron font-black text-sm text-white tracking-wider uppercase leading-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.65)]">
                  BOOST ON
                </span>
                <span className="text-[9px] font-mono text-cyan-300 mt-1 uppercase tracking-wider">
                  Game + VPN + Rules
                </span>
              </>
            )}
          </button>
        </div>

        {/* Live Coordination Progress / Active Telemetry Strip */}
        <div className="w-full mt-3 space-y-2">
          <div className="flex items-center justify-between gap-2 bg-[#040c1f] border border-cyan-950 rounded-xl px-3 py-2 text-[11px] font-mono">
            <div className="flex items-center space-x-2 min-w-0">
              {superBoost.errorMessage ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : isActive ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : isActivating ? (
                <Activity className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              )}
              <span className={`truncate ${isActive ? 'text-emerald-200' : 'text-cyan-200'}`}>
                {isActivating || isStopping
                  ? superBoost.currentStepLabel
                  : isActive
                  ? `${selectedGame.name} Protected · 2s Guard ON`
                  : 'Tap BOOST ON to start Profile, 1000-Layer VPN & Timer'}
              </span>
            </div>
            <span className="text-[10px] text-cyan-300 font-bold tabular-nums shrink-0 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{timerDisplay}</span>
            </span>
          </div>

          {/* 10-Stage Neon Pipeline Bar when Activating */}
          {isActivating && (
            <div className="grid grid-cols-5 gap-1 text-[8px] font-mono text-center">
              {SUPER_BOOST_STAGES.map((label, idx) => {
                const stepNum = idx + 1;
                const done = superBoost.completedSteps.includes(stepNum);
                const current = superBoost.currentStepIndex === stepNum;
                return (
                  <div
                    key={label}
                    className={`py-1 px-1 rounded-lg border truncate transition-colors ${
                      done
                        ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 font-bold'
                        : current
                        ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 animate-pulse'
                        : 'bg-[#030916] border-slate-800 text-slate-500'
                    }`}
                  >
                    {stepNum}.{label.split(' ')[0]}
                  </div>
                );
              })}
            </div>
          )}

          {/* Compact Active Protection Summary */}
          {isActive && (
            <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[9px]">
              <div className="bg-[#040c1f] border border-emerald-900/50 rounded-lg py-1.5 px-1">
                <Cpu className="w-3 h-3 text-emerald-400 mx-auto mb-0.5" />
                <span className="text-slate-300 block tabular-nums">RAM {state.ramUsagePercent}%</span>
              </div>
              <div className="bg-[#040c1f] border border-cyan-900/50 rounded-lg py-1.5 px-1">
                <ShieldCheck className="w-3 h-3 text-cyan-400 mx-auto mb-0.5" />
                <span className="text-slate-300 block tabular-nums">{blockedCount} Blocked</span>
              </div>
              <div className="bg-[#040c1f] border border-cyan-900/50 rounded-lg py-1.5 px-1">
                <Wifi className="w-3 h-3 text-cyan-400 mx-auto mb-0.5" />
                <span className="text-slate-300 block tabular-nums">
                  {state.isOnline === false ? 'Offline' : `${state.pingMs}ms`}
                </span>
              </div>
              <div className="bg-[#040c1f] border border-amber-900/50 rounded-lg py-1.5 px-1">
                <Flame className="w-3 h-3 text-amber-400 mx-auto mb-0.5" />
                <span className="text-slate-300 block tabular-nums">{state.temperatureC.toFixed(1)}°C</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <BoostDetailsModal />
      <PermissionFlowModal />
    </section>
  );
};
