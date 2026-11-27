import React, { useState } from 'react';
import { 
  RotateCcw, 
  Zap, 
  Flame, 
  Activity, 
  Wifi, 
  Cpu, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Globe2,
  RefreshCw,
  Radio,
  Server,
  Check,
  Cloud,
  Shield,
  ArrowDownCircle,
  ArrowUpCircle,
  Layers,
  HardDrive,
  AlertTriangle,
  Trash2,
  Thermometer,
  Snowflake,
  X
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { haptics } from '../utils/haptics.ts';
import { PerformanceHistoryGraph } from './PerformanceHistoryGraph.tsx';
import { ThermalMonitorPanel } from './ThermalMonitorPanel.tsx';
import { WebSocketPingCard } from './WebSocketPingCard.tsx';
import { BoostStatusCard } from './BoostStatusCard.tsx';
import { LatencyMonitor } from './LatencyMonitor.tsx';
import { formatBytesCompact, resolveNumericFps } from '../utils/gamingEngine.ts';

export const GamingDashboard: React.FC = () => {
  const { 
    state, 
    masterBoostActive,
    setCurrentScreen,
    superBoost,
    recoveryHistory,
    refreshHardwareTelemetry,
    clearTemporaryCache,
    bottleneckReport,
    applyOptimizationProfile,
    activeGame, 
    logs,
    setSnackBarMessage,
    serverRegions,
    selectedRegionId,
    activeRegion,
    isProbing,
    lastProbedTime,
    runPingProbe,
    selectPingRegion,
    cloudBackend,
    firewallState,
    appsList,
    networkDiagnostics,
    runFullNetworkDiagnostics,
    optimizeNetworkRoute,
    toggleAutoOptimizeNetwork,
    smartSession,
    gamesList,
    launchGameWithAutoBoost,
    deviceCapabilities,
    thermalMonitor,
    refreshThermalTelemetry,
    setThermalAlertThreshold,
    toggleAutoCoolOnHighTemp,
    dismissThermalWarning,
    applyThermalCooldownProfile,
  } = useBooster();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cleanedToast, setCleanedToast] = useState<string | null>(null);
  const [showCacheConfirmModal, setShowCacheConfirmModal] = useState(false);

  const remainingSec = Math.max(0, state.boostTimeRemainingSec || 0);

  const formatTimer = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRefreshTelemetry = async () => {
    setIsRefreshing(true);
    sound.playClick();
    await refreshHardwareTelemetry();
    setCleanedToast('Hardware Telemetry Refreshed');
    setTimeout(() => setIsRefreshing(false), 700);
    setTimeout(() => setCleanedToast(null), 2500);
  };

  const handleConfirmClearCache = async () => {
    setShowCacheConfirmModal(false);
    const res = await clearTemporaryCache();
    setCleanedToast(
      res.freedKb > 0
        ? `Cleared ${res.freedKb} KB Temp Cache!`
        : 'App Temp Cache Already Clean'
    );
    setTimeout(() => setCleanedToast(null), 3000);
  };

  const handleManualPingProbe = async () => {
    sound.playClick();
    await runPingProbe();
    sound.playSuccess();
  };

  // Honest Latency Thresholds (20-40ms target band, never altered):
  // <= 40ms = OPTIMAL (20-40ms Target), 41-80ms = GOOD, 81-160ms = MODERATE, > 160ms = HIGH
  const getPingQuality = (ms: number, reachable: boolean = true): { label: string; textColor: string; badgeClass: string } => {
    if (!reachable || ms <= 0) {
      return {
        label: 'PROBING',
        textColor: 'text-slate-400',
        badgeClass: 'text-slate-300 border-slate-600 bg-slate-900/70',
      };
    }
    if (ms <= 40) {
      return {
        label: '20-40ms TARGET',
        textColor: 'text-emerald-400',
        badgeClass: 'text-emerald-300 border-emerald-500/60 bg-emerald-950/50',
      };
    }
    if (ms <= 80) {
      return {
        label: 'GOOD',
        textColor: 'text-cyan-300',
        badgeClass: 'text-cyan-300 border-cyan-500/50 bg-cyan-950/40',
      };
    }
    if (ms <= 160) {
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

  const activePingMs = activeRegion.currentPingMs > 0 ? activeRegion.currentPingMs : networkDiagnostics.pingMs;
  const activePingQuality = getPingQuality(activePingMs, activeRegion.reachable !== false);
  const isHighPing = activePingMs > 160;

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 pt-1 space-y-4">
      {/* Toast */}
      {cleanedToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 border border-emerald-400 text-emerald-200 px-5 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{cleanedToast}</span>
        </div>
      )}

      {/* High-Temperature Gaming Session Warning Banner */}
      {(thermalMonitor.isHighTempWarning || thermalMonitor.severity === 'critical') && (
        <div
          role="alert"
          className={`p-3.5 rounded-2xl border space-y-2.5 shadow-xl ${
            thermalMonitor.severity === 'critical'
              ? 'bg-red-950/60 border-red-500 text-red-100'
              : 'bg-orange-950/55 border-orange-500/80 text-orange-100'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start space-x-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                thermalMonitor.severity === 'critical'
                  ? 'bg-red-500/20 border-red-400 text-red-300'
                  : 'bg-orange-500/20 border-orange-400 text-orange-300'
              }`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-orbitron font-extrabold text-xs uppercase tracking-wide flex items-center space-x-1.5">
                  <span>
                    {thermalMonitor.severity === 'critical'
                      ? 'Critical Temperature Warning'
                      : 'High Temperature Warning'}
                  </span>
                  <span className="font-mono tabular-nums text-white">
                    ({thermalMonitor.currentTempC.toFixed(1)}°C)
                  </span>
                </h4>
                <p className="text-[11px] font-mono text-slate-200 mt-1 leading-snug">
                  {thermalMonitor.warningMessage ||
                    `Device temperature reached ${thermalMonitor.currentTempC.toFixed(1)}°C during gaming. Reduce FPS target or let device cool.`}
                </p>
              </div>
            </div>
            {thermalMonitor.severity !== 'critical' && (
              <button
                type="button"
                onClick={dismissThermalWarning}
                aria-label="Dismiss thermal warning"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={applyThermalCooldownProfile}
              className="flex-1 min-h-[38px] py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-orbitron font-bold text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Snowflake className="w-3.5 h-3.5 shrink-0" />
              <span>Cool Down (60 FPS Mode)</span>
            </button>
            <button
              type="button"
              onClick={refreshThermalTelemetry}
              className="min-h-[38px] py-1.5 px-3 rounded-xl bg-black/40 border border-white/20 hover:border-white/40 text-white font-mono font-bold text-[10px] cursor-pointer whitespace-nowrap"
            >
              Re-Scan
            </button>
          </div>
        </div>
      )}

      {/* Prominent Master Boost Status Summary Card */}
      <BoostStatusCard />

      {/* Live Network Quality & 60s Ping History Monitor */}
      <LatencyMonitor />

      {/* Top Game / Boost Profile Status Header */}
      <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 transition-colors ${
        thermalMonitor.severity === 'critical'
          ? 'bg-red-950/45 border-red-500/70'
          : thermalMonitor.isHighTempWarning || thermalMonitor.severity === 'high'
          ? 'bg-orange-950/40 border-orange-500/70'
          : masterBoostActive
          ? 'bg-[#06183b] border-emerald-500/50'
          : 'bg-[#071333] border-cyan-900/60'
      }`}>
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
            thermalMonitor.severity === 'critical'
              ? 'bg-red-500/20 border-red-400/70 text-red-300'
              : thermalMonitor.isHighTempWarning || thermalMonitor.severity === 'high'
              ? 'bg-orange-500/20 border-orange-400/70 text-orange-300'
              : masterBoostActive
              ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
              : 'bg-cyan-500/20 border-cyan-400/50 text-cyan-400'
          }`}>
            {thermalMonitor.isHighTempWarning || thermalMonitor.severity === 'high' || thermalMonitor.severity === 'critical' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-orbitron font-bold text-xs text-white break-words">
              {masterBoostActive
                ? activeGame
                  ? activeGame.name
                  : 'High Priority Boost'
                : activeGame
                ? `${activeGame.name} · Ready`
                : 'Master Boost Ready'}
            </h3>
            <p className="text-[10px] text-cyan-400 font-mono break-words tabular-nums">
              {activeGame ? activeGame.packageName : 'Game Whitelist Ready'} · {thermalMonitor.currentTempC.toFixed(1)}°C
            </p>
          </div>
        </div>

        <span className={`text-[10px] border px-2.5 py-0.5 rounded-full font-mono font-bold whitespace-nowrap shrink-0 flex items-center space-x-1 tabular-nums ${
          thermalMonitor.severity === 'critical'
            ? 'bg-red-950 text-red-300 border-red-500/70'
            : thermalMonitor.isHighTempWarning || thermalMonitor.severity === 'high'
            ? 'bg-orange-950 text-orange-300 border-orange-500/70'
            : masterBoostActive
            ? 'bg-emerald-950 text-emerald-400 border-emerald-600/60'
            : 'bg-slate-900 text-slate-300 border-slate-700'
        }`}>
          {thermalMonitor.severity === 'critical' ? (
            <>
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>CRITICAL {thermalMonitor.currentTempC.toFixed(0)}°C</span>
            </>
          ) : thermalMonitor.isHighTempWarning || thermalMonitor.severity === 'high' ? (
            <>
              <Flame className="w-3 h-3 shrink-0" />
              <span>HIGH TEMP {thermalMonitor.currentTempC.toFixed(0)}°C</span>
            </>
          ) : (
            <span>{masterBoostActive ? 'BOOST ON' : 'BOOST OFF · READY'}</span>
          )}
        </span>
      </div>

      {/* Center: Circular Countdown Boost Timer */}
      <div className="flex flex-col items-center justify-center py-2 relative">
        <div className="relative flex items-center justify-center">
          {/* Neon Ring */}
          <div className={`w-48 h-48 rounded-full border-4 flex items-center justify-center relative ${
            masterBoostActive
              ? 'border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.35)]'
              : 'border-cyan-500/25 shadow-[0_0_24px_rgba(0,191,255,0.2)]'
          }`}>
            {/* Spinning accent dash only when Boost ON */}
            {masterBoostActive && (
              <div className="absolute inset-0 rounded-full border-4 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent animate-[spin_4s_linear_infinite]" />
            )}
            
            <div className="flex flex-col items-center text-center">
              <span className={`text-[11px] font-orbitron font-bold tracking-widest uppercase mb-1 ${
                masterBoostActive ? 'text-emerald-400' : 'text-cyan-400'
              }`}>
                {masterBoostActive ? 'Boost Active' : remainingSec > 0 ? 'Countdown Ready' : 'Boost OFF'}
              </span>
              <span className="font-orbitron font-black text-2xl text-white tracking-wider tabular-nums drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]">
                {formatTimer(remainingSec)}
              </span>
              <span className={`text-[10px] font-mono mt-1 flex items-center space-x-1 ${
                masterBoostActive ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                <ShieldCheck className="w-3 h-3" />
                <span>
                  {masterBoostActive
                    ? firewallState.isNativeAndroid
                      ? 'VPN FIREWALL ACTIVE'
                      : 'LOCAL FILTER ACTIVE'
                    : 'BOOST OFF · READY'}
                </span>
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
            <span className="text-[10px] text-slate-400 font-mono block">FPS ({state.maxHardwareHz}Hz MAX)</span>
            <div className="mt-0.5">
              <span className="font-orbitron font-extrabold text-xl text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                {state.currentFps} FPS
              </span>
            </div>
            {isHighPing ? (
              <span className="text-[10px] text-red-400 font-mono font-bold block mt-1 leading-tight">
                High Ping Detected
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-mono block mt-1 leading-tight">
                Target {Math.min(resolveNumericFps(state.activeFps, state.maxHardwareHz), state.maxHardwareHz || 120)} FPS
              </span>
            )}
          </div>
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* RAM & Refresh Card (Zero Fake Cleaning) */}
        <div 
          onClick={handleRefreshTelemetry}
          className="bg-[#071129]/90 border border-cyan-900/60 hover:border-cyan-500/60 transition-all rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-2 cursor-pointer"
          title="Tap to Refresh Live RAM Usage"
        >
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-mono block">REAL RAM USAGE</span>
            <div className="flex items-baseline flex-wrap gap-1 mt-0.5">
              <span className="font-orbitron font-extrabold text-xl text-emerald-400">
                {state.ramUsagePercent}%
              </span>
              <span className="text-[10px] text-slate-400 font-mono">({state.ramUsedGb}/{state.totalRamGb} GB)</span>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono block mt-1 flex items-center space-x-1">
              <RotateCcw className={`w-2.5 h-2.5 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Tap to Refresh</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        {/* Temperature Card */}
        <div
          onClick={refreshThermalTelemetry}
          className={`rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-2 border cursor-pointer transition-colors ${
            thermalMonitor.severity === 'critical'
              ? 'bg-red-950/45 border-red-500/80'
              : thermalMonitor.severity === 'high'
              ? 'bg-orange-950/40 border-orange-500/75'
              : thermalMonitor.severity === 'warm'
              ? 'bg-amber-950/30 border-amber-500/60'
              : 'bg-[#071129]/90 border-cyan-900/60 hover:border-cyan-500/60'
          }`}
          title="Tap to Refresh Device Thermal Telemetry"
        >
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-mono block">DEVICE TEMP</span>
            <span className={`font-orbitron font-extrabold text-xl block mt-0.5 leading-tight tabular-nums ${
              thermalMonitor.severity === 'critical'
                ? 'text-red-400'
                : thermalMonitor.severity === 'high'
                ? 'text-orange-400'
                : thermalMonitor.severity === 'warm'
                ? 'text-amber-300'
                : 'text-cyan-300'
            }`}>
              {thermalMonitor.currentTempC.toFixed(1)}°C
            </span>
            <span className="text-[10px] text-emerald-400 font-mono block mt-0.5 tabular-nums">
              Battery: {state.batteryLevel ?? 88}%{state.isBatteryCharging ? ' ⚡' : ''}
            </span>
            <span className={`text-[10px] font-mono font-bold block mt-0.5 ${
              thermalMonitor.severity === 'critical'
                ? 'text-red-300'
                : thermalMonitor.severity === 'high'
                ? 'text-orange-300'
                : thermalMonitor.severity === 'warm'
                ? 'text-amber-300'
                : 'text-slate-400'
            }`}>
              {thermalMonitor.severity.toUpperCase()} · Peak {thermalMonitor.peakSessionTempC.toFixed(1)}°C
            </span>
          </div>
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
            thermalMonitor.severity === 'critical'
              ? 'bg-red-950/80 border-red-500/50 text-red-400'
              : thermalMonitor.severity === 'high'
              ? 'bg-orange-950/80 border-orange-500/50 text-orange-400'
              : 'bg-amber-950/80 border-amber-500/40 text-amber-400'
          }`}>
            {thermalMonitor.severity === 'critical' || thermalMonitor.severity === 'high' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Thermometer className="w-5 h-5" />
            )}
          </div>
        </div>

        {/* Storage & App Temp Cache Card */}
        <div 
          onClick={() => {
            sound.playClick();
            setShowCacheConfirmModal(true);
          }}
          className="bg-[#071129]/90 border border-cyan-900/60 hover:border-cyan-500/60 rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-2 cursor-pointer"
        >
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-mono block">FREE STORAGE</span>
            <span className="font-orbitron font-extrabold text-xl text-cyan-300 block mt-0.5 leading-tight">
              {Number(state.storage?.freeGb ?? 28.4).toFixed(1)} GB
            </span>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              of {Number(state.storage?.totalGb ?? 64).toFixed(1)} GB Total
            </span>
            <span className="text-[10px] text-cyan-400 font-mono block mt-0.5 flex items-center space-x-1">
              <Trash2 className="w-2.5 h-2.5" />
              <span>Cache: {state.storage?.appTempCacheKb ?? 0} KB</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        {/* Ping Card (Full width, real measured latency & direct route stability) */}
        <div className="col-span-2 bg-[#071129]/90 border border-cyan-900/60 rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-mono block">
              NETWORK LATENCY · {networkDiagnostics.connectionType}{networkDiagnostics.wifiBand ? ` ${networkDiagnostics.wifiBand}` : ''}
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="font-orbitron font-extrabold text-2xl text-cyan-400 tabular-nums">
                {state.isOnline === false
                  ? 'Offline'
                  : activePingMs > 0
                  ? `${activePingMs}ms`
                  : 'Probing...'}
              </span>
              {state.isOnline !== false && activePingMs > 0 && (
                <span className={`text-[10px] font-mono font-bold ${activePingQuality.textColor}`}>
                  {activePingQuality.label}
                </span>
              )}
            </div>
            <span className="text-[10px] text-cyan-300 font-mono block mt-1 truncate">
              {activeRegion.name} · Jitter ±{networkDiagnostics.jitterMs}ms · Stability {networkDiagnostics.stabilityPercent}%
            </span>
            {networkDiagnostics.stabilityReason && (
              <span className={`text-[9px] font-mono block mt-0.5 truncate ${
                networkDiagnostics.stabilityStatus === 'vpn_overhead' ||
                networkDiagnostics.stabilityStatus === 'unstable_wifi' ||
                networkDiagnostics.stabilityStatus === 'unstable_mobile'
                  ? 'text-amber-300'
                  : networkDiagnostics.targetAchievable20to40
                  ? 'text-emerald-300'
                  : 'text-slate-400'
              }`}>
                {networkDiagnostics.stabilityReason}
              </span>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Wifi className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Real Performance Bottleneck Detector Card */}
      <div className={`p-3.5 rounded-2xl border space-y-2 ${
        bottleneckReport.level === 'critical'
          ? 'bg-red-950/35 border-red-500/70'
          : bottleneckReport.level === 'warning'
          ? 'bg-amber-950/35 border-amber-500/70'
          : 'bg-emerald-950/30 border-emerald-600/60'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            {bottleneckReport.level === 'optimal' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className={`w-4 h-4 ${bottleneckReport.level === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
            )}
            <h4 className="font-orbitron font-bold text-xs text-white uppercase">
              Bottleneck &amp; Device Advisor
            </h4>
          </div>
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-cyan-300 border border-cyan-700/50">
            Rec: {bottleneckReport.recommendedFps} FPS
          </span>
        </div>

        {bottleneckReport.bottlenecks.length === 0 ? (
          <p className="text-[11px] font-mono text-emerald-300">
            {bottleneckReport.summary}
          </p>
        ) : (
          <div className="space-y-1.5">
            {bottleneckReport.bottlenecks.map(b => (
              <div key={b.id} className="bg-black/35 border border-white/10 rounded-xl p-2 text-[10px] font-mono space-y-0.5">
                <div className={`font-bold ${b.severity === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>
                  {b.title}
                </div>
                <p className="text-slate-300">{b.detail}</p>
                <p className="text-cyan-300">→ {b.recommendation}</p>
              </div>
            ))}
            <button
              type="button"
              onClick={() => applyOptimizationProfile(bottleneckReport.recommendedProfile)}
              className="w-full py-1.5 rounded-xl bg-amber-400 text-black text-[10px] font-orbitron font-bold cursor-pointer"
            >
              Apply Recommended Profile ({bottleneckReport.recommendedFps} FPS)
            </button>
          </div>
        )}
      </div>

      {/* Device Temperature Monitor & High-Temp Alert Controls */}
      <ThermalMonitorPanel
        thermal={thermalMonitor}
        isInGamingSession={Boolean(state.isGamingModeOn || state.isBoosting || smartSession.isActive)}
        onRefresh={refreshThermalTelemetry}
        onChangeThreshold={setThermalAlertThreshold}
        onToggleAutoCool={toggleAutoCoolOnHighTemp}
        onApplyCooldown={applyThermalCooldownProfile}
      />

      {/* D3.js 30-Min Neon FPS Performance History Graph */}
      <PerformanceHistoryGraph />

      {/* Real-Time Local Gaming Server WebSocket Ping Monitor */}
      <WebSocketPingCard />

      {/* Server Status + Firewall Status Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-[#071129]/95 border border-cyan-900/60 rounded-2xl p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>CLOUD SERVER</span>
            </span>
            <span className={`w-2 h-2 rounded-full ${
              cloudBackend.status === 'connected' ? 'bg-emerald-400 animate-pulse' :
              cloudBackend.status === 'checking' ? 'bg-amber-400 animate-ping' : 'bg-red-400'
            }`} />
          </div>
          <div className="font-orbitron font-bold text-xs text-white">
            {cloudBackend.status === 'connected'
              ? `Online (${cloudBackend.rttMs ?? '--'}ms)`
              : cloudBackend.status === 'checking'
              ? 'Checking...'
              : 'Offline Cache'}
          </div>
          <p className="text-[9px] text-cyan-300/80 font-mono truncate">
            {cloudBackend.remoteConfig.configVersion} • {cloudBackend.deviceTier}
          </p>
        </div>

        <div className="bg-[#071129]/95 border border-cyan-900/60 rounded-2xl p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>VPN HEALTH</span>
            </span>
            <span className={`text-[9px] font-mono font-bold px-1.5 rounded ${
              firewallState.conflictDetected || firewallState.connectionState === 'ERROR'
                ? 'bg-red-950 text-red-300 border border-red-500/60'
                : firewallState.enabled
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {firewallState.isNativeAndroid
                ? firewallState.connectionState
                : firewallState.enabled
                ? 'READY'
                : 'OFF'}
            </span>
          </div>
          <div className="font-orbitron font-bold text-xs text-white truncate tabular-nums">
            {appsList.filter(a => a.isBlocked).length} Filtered · {formatBytesCompact(firewallState.blockedBytesTotal)}
          </div>
          <p className="text-[9px] text-emerald-300/80 font-mono truncate tabular-nums">
            {firewallState.lastFailureReason
              ? firewallState.lastFailureReason
              : firewallState.isNativeAndroid && firewallState.persistentServiceRunning
              ? `${firewallState.activeTransport} · HB #${firewallState.heartbeatCount ?? 0}${firewallState.wakeLockActive ? ' · WL' : ''} · TCP ${firewallState.blockedTcpPackets}`
              : `${firewallState.activeTransport} · TCP ${firewallState.blockedTcpPackets} / DNS ${firewallState.blockedDnsQueries}`}
          </p>
        </div>
      </div>

      {/* 8-Step Smart Gaming Session Monitor / Quick Start */}
      <div className="bg-[#06122b]/95 border border-cyan-800/60 rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-orbitron font-bold text-xs text-white uppercase">
              Smart Gaming Session (8-Step)
            </span>
          </div>
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
            smartSession.isActive
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
              : 'bg-slate-900 text-slate-300 border border-slate-700'
          }`}>
            {smartSession.isActive ? `ACTIVE • ${smartSession.profileUsed}` : `READY • ${deviceCapabilities.thermalStatus}`}
          </span>
        </div>

        {smartSession.isActive ? (
          <div className="grid grid-cols-4 gap-1.5 text-[9px] font-mono text-center">
            {[
              '1.Game Lock',
              '2.Profile',
              '3.Save FW',
              '4.Allow Game',
              '5.Thermal',
              '6.Net Stats',
              '7.Report',
              '8.Restore',
            ].map((label, idx) => {
              const stepNum = idx + 1;
              const done = smartSession.completedSteps.includes(stepNum);
              return (
                <div
                  key={label}
                  className={`py-1 px-1 rounded-lg border ${
                    done
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 font-bold'
                      : 'bg-[#040a18] border-slate-800 text-slate-400'
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5">
            {gamesList.slice(0, 4).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => launchGameWithAutoBoost(g)}
                className="px-2.5 py-1.5 rounded-xl bg-[#040d21] border border-cyan-800/60 hover:border-cyan-400 text-[10px] font-mono text-cyan-200 whitespace-nowrap cursor-pointer shrink-0"
              >
                ▶ {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* REAL-TIME PING MONITOR & OPTIMIZATION ENGINE */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#041029] via-[#051433] to-[#020a1f] border-2 border-cyan-500/60 shadow-xl shadow-cyan-950/60 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-cyan-900/60">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-cyan-400 shadow-sm shrink-0">
              <Globe2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="font-orbitron font-extrabold text-xs text-white uppercase tracking-wider truncate">
                REAL-TIME PING ENGINE
              </h4>
              <p className="text-[10px] text-cyan-300/80 font-mono truncate">
                Measured 1-RTT · {lastProbedTime}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={async () => {
                haptics.impactMedium();
                sound.playClick();
                await optimizeNetworkRoute('Manual Route Optimization');
              }}
              disabled={isProbing}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/70 hover:bg-emerald-500/30 text-emerald-200 text-[10px] font-mono font-bold cursor-pointer disabled:opacity-50"
              title="Find Best Non-VPN Direct Route & Quiet Background Traffic"
            >
              Optimize
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleManualPingProbe();
                await runFullNetworkDiagnostics();
              }}
              disabled={isProbing || networkDiagnostics.isMeasuringSpeed}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold flex items-center space-x-1 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="Probe Latency & Network Speed Diagnostics"
            >
              <RefreshCw className={`w-3 h-3 ${isProbing || networkDiagnostics.isMeasuringSpeed ? 'animate-spin' : ''}`} />
              <span>{isProbing || networkDiagnostics.isMeasuringSpeed ? 'Testing...' : 'Test Net'}</span>
            </button>
          </div>
        </div>

        {/* Direct Routing, Stability & 20-40ms Honesty Diagnostic Strip */}
        <div
          className={`p-2.5 rounded-xl border text-[10px] font-mono space-y-1 ${
            networkDiagnostics.stabilityStatus === 'vpn_overhead' ||
            networkDiagnostics.stabilityStatus === 'unstable_wifi' ||
            networkDiagnostics.stabilityStatus === 'unstable_mobile' ||
            networkDiagnostics.stabilityStatus === 'offline'
              ? 'bg-amber-950/35 border-amber-500/60 text-amber-200'
              : networkDiagnostics.targetAchievable20to40
              ? 'bg-emerald-950/35 border-emerald-500/50 text-emerald-200'
              : 'bg-[#030c1f] border-cyan-900/70 text-cyan-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold uppercase">
              {networkDiagnostics.routingMode === 'EXTERNAL_VPN_HOP'
                ? 'VPN Overhead Detected'
                : networkDiagnostics.routingMode === 'GAME_EXCLUDED_BYPASS'
                ? 'Direct Game Bypass (0ms VPN Hop)'
                : 'Direct Physical Route (No VPN)'}
            </span>
            <button
              type="button"
              onClick={toggleAutoOptimizeNetwork}
              className={`px-2 py-0.5 rounded border text-[9px] font-bold cursor-pointer ${
                networkDiagnostics.autoOptimizeEnabled !== false
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              Auto-Opt {networkDiagnostics.autoOptimizeEnabled !== false ? 'ON' : 'OFF'}
            </button>
          </div>
          <p className="text-[10px] leading-snug">
            {networkDiagnostics.stabilityReason ||
              'Measuring real network latency & connection stability...'}
          </p>
          {networkDiagnostics.lastOptimizationAction && (
            <p className="text-[9px] text-slate-300 truncate">
              Last Action: {networkDiagnostics.lastOptimizationAction}
            </p>
          )}
        </div>

        {/* Measured Network Speed, Loss, Jitter & Stability Row */}
        <div className="grid grid-cols-4 gap-1.5 text-center font-mono tabular-nums">
          <div className="bg-[#030c1f] border border-cyan-950 rounded-xl p-1.5">
            <span className="text-[8px] text-slate-400 flex items-center justify-center space-x-0.5">
              <ArrowDownCircle className="w-2.5 h-2.5 text-emerald-400" />
              <span>DOWN</span>
            </span>
            <span className="text-[11px] font-bold text-emerald-300 block">
              {networkDiagnostics.downloadMbps > 0 ? `${networkDiagnostics.downloadMbps}M` : '--'}
            </span>
          </div>
          <div className="bg-[#030c1f] border border-cyan-950 rounded-xl p-1.5">
            <span className="text-[8px] text-slate-400 flex items-center justify-center space-x-0.5">
              <ArrowUpCircle className="w-2.5 h-2.5 text-cyan-400" />
              <span>UP</span>
            </span>
            <span className="text-[11px] font-bold text-cyan-300 block">
              {networkDiagnostics.uploadMbps > 0 ? `${networkDiagnostics.uploadMbps}M` : '--'}
            </span>
          </div>
          <div className="bg-[#030c1f] border border-cyan-950 rounded-xl p-1.5">
            <span className="text-[8px] text-slate-400 block">JITTER / LOSS</span>
            <span className="text-[10px] font-bold text-amber-300 block">
              {networkDiagnostics.jitterMs}ms / {networkDiagnostics.packetLossPercent}%
            </span>
          </div>
          <div className="bg-[#030c1f] border border-cyan-950 rounded-xl p-1.5">
            <span className="text-[8px] text-slate-400 block">STABILITY</span>
            <span
              className={`text-[11px] font-bold block ${
                networkDiagnostics.stabilityPercent >= 80
                  ? 'text-emerald-400'
                  : networkDiagnostics.stabilityPercent >= 55
                  ? 'text-amber-300'
                  : 'text-red-400'
              }`}
            >
              {networkDiagnostics.stabilityPercent}%
            </span>
          </div>
        </div>

        {/* Server Regions List */}
        <div className="space-y-2">
          {serverRegions.map((region) => {
            const isSelected = region.id === selectedRegionId;
            const reachable = region.reachable !== false && region.currentPingMs > 0;
            const quality = getPingQuality(region.currentPingMs, reachable);

            return (
              <div
                key={region.id}
                onClick={() => {
                  sound.playClick();
                  selectPingRegion(region.id);
                  setSnackBarMessage(
                    reachable
                      ? `Active Route: ${region.name} (${region.currentPingMs}ms)`
                      : `${region.name} unreachable on current connection`
                  );
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

                <div className="text-right shrink-0 tabular-nums">
                  <div className="leading-tight">
                    <span className={`font-orbitron font-extrabold text-xs px-2 py-0.5 rounded-lg border inline-block whitespace-nowrap ${quality.badgeClass}`}>
                      {reachable ? `${region.currentPingMs} ms` : 'N/A'}
                    </span>
                    <span className={`text-[9px] font-mono font-bold block mt-0.5 whitespace-nowrap ${quality.textColor}`}>
                      {reachable ? `${quality.label} • ±${region.jitterMs}ms` : `${region.packetLossPercent}% loss`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Route Status Summary (Actual Measured Results Only) */}
        <div className="p-2.5 rounded-xl bg-[#020817] border border-cyan-950 flex items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center space-x-2 text-slate-300 min-w-0">
            <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="break-words">
              Actual Probe: <strong className="text-cyan-300">{activeRegion.name}</strong>
              {typeof networkDiagnostics.wifiRssiDbm === 'number' && networkDiagnostics.wifiRssiDbm < 0
                ? ` (${networkDiagnostics.wifiRssiDbm} dBm)`
                : ''}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded whitespace-nowrap shrink-0 tabular-nums">
            {networkDiagnostics.packetLossPercent}% LOSS
          </span>
        </div>
      </div>

      {/* Honest Performance Status Banner */}
      <div className={`p-3.5 rounded-2xl text-center flex items-center justify-center space-x-2 border ${
        state.isOnline === false
          ? 'bg-slate-800/80 border-slate-600 text-slate-200'
          : bottleneckReport.level === 'critical'
          ? 'bg-red-950/70 border-red-500 text-red-200'
          : bottleneckReport.level === 'warning'
          ? 'bg-amber-950/70 border-amber-500 text-amber-200'
          : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] text-white'
      }`}>
        {bottleneckReport.level === 'optimal' && state.isOnline !== false ? (
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 shrink-0" />
        )}
        <span className="font-orbitron font-black text-xs sm:text-sm tracking-wider uppercase">
          {state.isOnline === false
            ? 'Offline • Local Engine Ready'
            : bottleneckReport.level === 'optimal'
            ? 'Frame Pacing Optimal!'
            : 'Performance Alert — See Advisor'}
        </span>
      </div>

      {/* Navigation back to the single Master Boost ON/OFF Control */}
      <button
        type="button"
        onClick={() => {
          haptics.impactLight();
          sound.playClick();
          setCurrentScreen('home');
        }}
        className="w-full min-h-[48px] py-3.5 rounded-2xl bg-[#071636] border border-cyan-500/60 text-cyan-200 hover:text-white hover:bg-cyan-950/60 font-orbitron font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg active:scale-98"
      >
        <Zap className="w-4 h-4" />
        <span>
          {superBoost.status === 'active' || state.isBoosting
            ? 'Open Master Boost ON/OFF Control'
            : 'Return to Boost Control'}
        </span>
      </button>

      {/* Auto-Recovery & VPN Watchdog History */}
      <div className="bg-[#050b1a] border border-cyan-950 rounded-2xl p-3 font-mono text-[10px] space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 font-bold uppercase tracking-wider">
            Auto-Recovery &amp; VPN Watchdog
          </span>
          <span className="text-[9px] text-cyan-400 tabular-nums">
            Reconnects: {firewallState.reconnectCount}
          </span>
        </div>
        <div className="max-h-24 overflow-y-auto space-y-1">
          {recoveryHistory.slice(0, 6).map((ev) => (
            <div key={ev.id} className="flex items-start justify-between gap-2 text-slate-300">
              <span
                className={`truncate ${
                  ev.severity === 'error'
                    ? 'text-red-300'
                    : ev.severity === 'warning'
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                [{ev.category.toUpperCase()}] {ev.message}
              </span>
              <span className="text-[9px] text-slate-500 shrink-0 tabular-nums">
                {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Live System Process Logs */}
      <div className="bg-[#050b1a] border border-cyan-950 rounded-2xl p-3 font-mono text-[10px] space-y-1">
        <span className="text-slate-400 font-bold block uppercase tracking-wider mb-1">
          Engine Telemetry Log
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

      {/* Explicit User Permission Confirmation Modal for Temp Cache */}
      {showCacheConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-[#071333] border border-cyan-500/60 rounded-3xl p-5 shadow-2xl space-y-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center mx-auto text-cyan-300">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-orbitron font-bold text-sm text-white">Clear Temporary App Cache?</h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Removes <strong className="text-cyan-300">{state.storage?.appTempCacheKb ?? 0} KB</strong> of temporary cache files inside Global Game Booster only.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCacheConfirmModal(false)}
                className="py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold font-orbitron cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearCache}
                className="py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold font-orbitron cursor-pointer"
              >
                Confirm Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
