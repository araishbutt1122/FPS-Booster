import React from 'react';
import {
  X,
  ShieldCheck,
  Gamepad2,
  Cpu,
  BellOff,
  Clock,
  CheckCircle2,
  Activity,
  BatteryCharging,
  Eye,
  Shield,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { PermissionFlowStep } from '../types.ts';
import { sound } from '../utils/audio.ts';
import { haptics } from '../utils/haptics.ts';
import { resolveNumericFps } from '../utils/gamingEngine.ts';

function formatCountdown(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
}

export const BoostDetailsModal: React.FC = () => {
  const {
    state,
    appsList,
    firewallState,
    masterBoostActive,
    isBoostDetailsOpen,
    setIsBoostDetailsOpen,
    boostDetailsSummary,
    setCurrentScreen,
    activeGame,
  } = useBooster();

  if (!isBoostDetailsOpen) return null;

  const blockedApps = appsList.filter((a) => a.isBlocked);
  const protectedGameName =
    boostDetailsSummary?.protectedGameName ||
    activeGame?.name ||
    firewallState.protectedGameName ||
    'Target Game';
  const profileLabel =
    boostDetailsSummary?.profileName || state.activeProfile.replace(/_/g, ' ');
  const targetFps = resolveNumericFps(boostDetailsSummary?.targetFps || state.activeFps, state.maxHardwareHz);
  const vpnActive = boostDetailsSummary?.vpnActive ?? firewallState.enabled;
  const vpnStateLabel = firewallState.isNativeAndroid
    ? firewallState.enabled
      ? `${firewallState.connectionState} · Layer #${firewallState.vpnLayer || 1}/1000`
      : 'READY · 1000 Layers'
    : vpnActive
    ? `LOCAL FILTER ENGINE · Layer #${firewallState.firewallLayer || 1}/1000`
    : 'READY · 1000 Layers';
  const blockedNames =
    boostDetailsSummary?.blockedAppNames && boostDetailsSummary.blockedAppNames.length > 0
      ? boostDetailsSummary.blockedAppNames
      : blockedApps.map((a) => a.name);
  const remainingSec = Math.max(0, state.boostTimeRemainingSec || 0);

  const handleClose = () => {
    haptics.selection();
    sound.playClick();
    setIsBoostDetailsOpen(false);
  };

  const handleGoDashboard = () => {
    haptics.impactLight();
    sound.playClick();
    setIsBoostDetailsOpen(false);
    setCurrentScreen('dashboard');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="boost-details-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-[#061129] border border-cyan-500/50 shadow-[0_0_45px_rgba(0,191,255,0.28)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-[#040c1e] border-b border-cyan-900/60">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="boost-details-modal-title"
                className="font-orbitron font-extrabold text-sm text-white uppercase tracking-wide truncate"
              >
                Boost Details
              </h2>
              <p className="text-[10px] font-mono text-emerald-300 truncate">
                {masterBoostActive ? 'Active Optimizations Summary' : 'Session Summary'} · {protectedGameName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close Boost Details"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-2.5 max-h-[72vh] overflow-y-auto text-xs font-mono">
          {/* 1. Performance Profile & Gaming Mode */}
          <div className="rounded-2xl bg-[#040c1f] border border-cyan-900/60 p-3 flex items-start justify-between gap-3">
            <div className="flex items-start space-x-2.5 min-w-0">
              <Gamepad2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-slate-400 text-[10px] uppercase">Performance Profile</div>
                <div className="text-white font-orbitron font-bold text-xs mt-0.5 truncate">
                  {profileLabel} · {targetFps} FPS
                </div>
                <div className="text-[10px] text-cyan-300 mt-0.5">
                  Panel Cap: {state.maxHardwareHz}Hz · Game Whitelisted
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-300 shrink-0">
              {state.isGamingModeOn ? 'ACTIVE' : 'READY'}
            </span>
          </div>

          {/* 2. Local VPN Firewall Status */}
          <div className="rounded-2xl bg-[#040c1f] border border-cyan-900/60 p-3 flex items-start justify-between gap-3">
            <div className="flex items-start space-x-2.5 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-slate-400 text-[10px] uppercase">VPN Firewall Engine</div>
                <div className="text-white font-orbitron font-bold text-xs mt-0.5">
                  {firewallState.isNativeAndroid
                    ? `Android VpnService (${vpnStateLabel})`
                    : vpnActive
                    ? `Local Filter Engine Active (L#${firewallState.vpnLayer || 1}/1000)`
                    : 'Local Filter Rules Ready (1000 Layers)'}
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  {firewallState.isNativeAndroid
                    ? firewallState.persistentServiceRunning
                      ? `2s Watchdog · HB #${firewallState.heartbeatCount ?? 0} · FW L#${firewallState.firewallLayer || 1}/1000`
                      : 'Foreground Guard Ready'
                    : `FW L#${firewallState.firewallLayer || 1}/1000 · Local app filtering & DNS guard`}
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold shrink-0 ${
                vpnActive ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {vpnActive ? 'ON' : 'PAUSED'}
            </span>
          </div>

          {/* 3. Background Data Blocking & DNS */}
          <div className="rounded-2xl bg-[#040c1f] border border-cyan-900/60 p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-2.5 min-w-0">
                <Layers className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-slate-400 text-[10px] uppercase">Background Data Blocking</div>
                  <div className="text-white font-orbitron font-bold text-xs mt-0.5 tabular-nums">
                    {blockedApps.length} Apps Filtered · DNS {firewallState.dnsFilterEnabled ? 'ON' : 'OFF'}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-cyan-300 shrink-0">APPLIED</span>
            </div>

            {blockedNames.length > 0 && (
              <p className="text-[10px] text-slate-300 leading-relaxed pl-6">
                Filtered: {blockedNames.slice(0, 5).join(' · ')}
                {blockedNames.length > 5 ? ` · +${blockedNames.length - 5} more` : ''}
              </p>
            )}
          </div>

          {/* 4. RAM Trim & Notification DND */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-[#040c1f] border border-cyan-900/60 p-3">
              <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>RAM Status</span>
              </div>
              <div className="text-white font-orbitron font-bold text-xs mt-1 tabular-nums">
                {state.ramUsagePercent}% Used
              </div>
              <div className="text-[10px] text-emerald-300 mt-0.5 tabular-nums">
                {boostDetailsSummary && boostDetailsSummary.ramFreedMb > 0
                  ? `${boostDetailsSummary.ramFreedMb} MB trimmed`
                  : `${state.ramUsedGb}/${state.totalRamGb} GB`}
              </div>
            </div>

            <div className="rounded-2xl bg-[#040c1f] border border-cyan-900/60 p-3">
              <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                <BellOff className="w-3.5 h-3.5 text-amber-300" />
                <span>Focus DND</span>
              </div>
              <div className="text-white font-orbitron font-bold text-xs mt-1">
                {boostDetailsSummary?.dndActive ? 'DND Enabled' : 'Guard Ready'}
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                {boostDetailsSummary?.dndActive
                  ? 'Auto-restores on OFF'
                  : 'Allow in Android Settings'}
              </div>
            </div>
          </div>

          {/* 5. Boost Timer */}
          <div className="rounded-2xl bg-[#040c1f] border border-cyan-900/60 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <div className="text-slate-400 text-[10px] uppercase">Session Timer</div>
                <div className="text-white font-orbitron font-bold text-xs mt-0.5 tabular-nums">
                  {state.boostTimeRemainingSec > 0
                    ? `${formatCountdown(state.boostTimeRemainingSec)} Remaining`
                    : `${state.selectedBoostMinutes || 30}m Preset`}
                </div>
              </div>
            </div>
            <div className="text-right tabular-nums">
              <div className="text-[10px] text-slate-400">Countdown</div>
              <div className="text-emerald-300 font-bold text-xs">
                {remainingSec > 0 ? 'AUTO-OFF AT 00:00' : 'READY'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 pt-2 border-t border-cyan-900/50 bg-[#040c1e] grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleGoDashboard}
            className="min-h-[44px] py-2.5 px-3 rounded-2xl bg-[#0a1d42] border border-cyan-500/60 hover:bg-cyan-950 text-cyan-200 font-orbitron font-bold text-[11px] uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] py-2.5 px-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-orbitron font-black text-[11px] uppercase tracking-wider cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

interface StepMeta {
  number: number;
  title: string;
  subtitle: string;
  why: string;
  icon: React.ReactNode;
}

const STEP_META: Record<PermissionFlowStep, StepMeta> = {
  battery: {
    number: 1,
    title: 'Ignore Battery Optimization',
    subtitle: 'Prevent Android from stopping Boost after 2 minutes',
    why: 'Android Doze aggressively pauses background gaming guards after ~2 minutes unless battery exemption is granted.',
    icon: <BatteryCharging className="w-6 h-6 text-emerald-300" />,
  },
  usage: {
    number: 2,
    title: 'Usage Access Permission',
    subtitle: 'Detect active game & trim idle background apps',
    why: 'Allows the gaming engine to verify your foreground game and apply targeted per-game optimization profiles.',
    icon: <Eye className="w-6 h-6 text-cyan-300" />,
  },
  dnd: {
    number: 3,
    title: 'Notification & Do Not Disturb Access',
    subtitle: 'Silence distracting alerts during active matches',
    why: 'Temporarily silences heads-up notifications when BOOST ON starts, and automatically restores them on BOOST OFF.',
    icon: <BellOff className="w-6 h-6 text-amber-300" />,
  },
  vpn: {
    number: 4,
    title: 'Local VPN Firewall Consent',
    subtitle: 'Create on-device tunnel to block background data',
    why: 'Required by Android OS to filter restricted background apps locally on your phone while whitelisting your game.',
    icon: <Shield className="w-6 h-6 text-cyan-300" />,
  },
};

export const PermissionFlowModal: React.FC = () => {
  const {
    permissionFlow,
    handlePermissionFlowAllow,
    skipPermissionFlowStep,
    closePermissionFlow,
  } = useBooster();

  if (!permissionFlow.isOpen || !permissionFlow.currentStep) return null;

  const step = permissionFlow.currentStep;
  const meta = STEP_META[step];
  const stepIdx = permissionFlow.stepsQueue.indexOf(step);
  const totalSteps = Math.max(1, permissionFlow.stepsQueue.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-flow-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-[#061129] border border-cyan-500/55 shadow-[0_0_45px_rgba(0,191,255,0.3)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-[#040c1e] border-b border-cyan-900/60">
          <div>
            <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider">
              First-Time Setup · Step {stepIdx + 1} of {totalSteps}
            </span>
            <h2
              id="permission-flow-title"
              className="font-orbitron font-extrabold text-sm text-white uppercase mt-0.5"
            >
              One-Time Boost Permissions
            </h2>
          </div>

          <button
            type="button"
            onClick={closePermissionFlow}
            aria-label="Cancel permission setup"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="px-4 pt-3 flex items-center gap-1.5">
          {permissionFlow.stepsQueue.map((s, idx) => {
            const done = idx < stepIdx;
            const current = idx === stepIdx;
            return (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  done ? 'bg-emerald-400' : current ? 'bg-cyan-400' : 'bg-slate-800'
                }`}
              />
            );
          })}
        </div>

        {/* Active Step Content */}
        <div className="p-4 space-y-3.5">
          <div className="flex items-start space-x-3 bg-[#040c1f] border border-cyan-900/60 rounded-2xl p-3.5">
            <div className="w-11 h-11 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shrink-0">
              {meta.icon}
            </div>
            <div className="min-w-0">
              <div className="font-orbitron font-bold text-sm text-white">{meta.title}</div>
              <p className="text-xs font-mono text-cyan-300 mt-0.5">{meta.subtitle}</p>
              <p className="text-[11px] font-mono text-slate-300 mt-2 leading-relaxed">
                {meta.why}
              </p>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-400 text-center">
            Granted once — future BOOST ON taps start immediately without prompts.
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={skipPermissionFlowStep}
              disabled={permissionFlow.isRequesting}
              className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-orbitron font-bold text-xs uppercase cursor-pointer disabled:opacity-50"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handlePermissionFlowAllow}
              disabled={permissionFlow.isRequesting}
              className="flex-1 min-h-[46px] px-4 py-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-orbitron font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
            >
              <span>{permissionFlow.isRequesting ? 'Opening Settings...' : 'Allow & Continue'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
