import React, { useState, useRef, lazy, Suspense } from 'react';
import { 
  Gauge, 
  Crown, 
  Zap, 
  CheckCircle2, 
  Sparkles,
  Info,
  RotateCcw,
  KeyRound,
  HardDrive,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { haptics } from '../utils/haptics.ts';
import { FPSMode } from '../types.ts';
import { resolveNumericFps } from '../utils/gamingEngine.ts';
import { OneTapBoostButton } from './OneTapBoostButton.tsx';

const AdminPanel = lazy(() =>
  import('./AdminPanel.tsx').then((m) => ({ default: m.AdminPanel }))
);

export const HomeScreen: React.FC = () => {
  const { 
    state, 
    setFpsMode,
    refreshHardwareTelemetry,
    clearTemporaryCache,
    userPaymentNotification,
    clearPaymentNotification,
    snackBarMessage,
    setSnackBarMessage,
    applyOptimizationProfile,
    bottleneckReport,
    cloudBackend,
  } = useBooster();

  const [ramNotification, setRamNotification] = useState<string | null>(null);
  const [showCacheConfirmModal, setShowCacheConfirmModal] = useState(false);

  // Hidden 5-tap logo admin trigger
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const logoTapRef = useRef({ count: 0, lastTime: 0 });

  const handleLogoTap = () => {
    haptics.impactLight();
    sound.playBoost();
    const now = Date.now();
    if (now - logoTapRef.current.lastTime < 2500) {
      logoTapRef.current.count += 1;
    } else {
      logoTapRef.current.count = 1;
    }
    logoTapRef.current.lastTime = now;

    if (logoTapRef.current.count >= 5) {
      logoTapRef.current.count = 0;
      setShowAdminPinModal(true);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '7890') {
      haptics.success();
      sound.playSuccess();
      setShowAdminPinModal(false);
      setAdminPin('');
      setPinError(false);
      setIsAdminOpen(true);
    } else {
      haptics.error();
      sound.playClick();
      setPinError(true);
    }
  };

  // FPS TARGET PROFILE SELECTION (Hardware-aware; configured inside Super Boost)
  const handleFpsCardClick = (mode: FPSMode) => {
    haptics.selection();
    sound.playClick();
    setFpsMode(mode);
    const numericTarget = resolveNumericFps(mode, state.maxHardwareHz);
    if (numericTarget > (state.maxHardwareHz || 60)) {
      setSnackBarMessage(`Device max is ${state.maxHardwareHz}Hz — target capped safely`);
    } else {
      setSnackBarMessage(`${numericTarget} FPS Target Selected for Boost`);
    }
  };

  const handleConfirmClearCache = async () => {
    haptics.success();
    setShowCacheConfirmModal(false);
    const res = await clearTemporaryCache();
    setRamNotification(
      res.freedKb > 0
        ? `App Temp Cache Cleared: ${res.freedKb} KB Freed (${res.freeGb} GB Free)`
        : `App Temp Cache Clean (${res.freeGb} GB Storage Free)`
    );
    setTimeout(() => setRamNotification(null), 3500);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 pt-1 space-y-3.5">
      {/* Toast / SnackBar Notification */}
      {snackBarMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-cyan-950 to-blue-950 border border-cyan-400 text-cyan-200 px-4 py-2 rounded-full text-xs font-bold shadow-2xl shadow-cyan-900/60 flex items-center space-x-2 max-w-[90vw] text-center">
          {snackBarMessage.includes('Activated') || snackBarMessage.includes('Started') || snackBarMessage.includes('Verified') || snackBarMessage.includes('Boosted') ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{snackBarMessage}</span>
        </div>
      )}

      {/* RAM Cleaned Alert Banner */}
      {ramNotification && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-cyan-950/90 border border-emerald-400/80 shadow-lg shadow-emerald-950/60 flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2 text-xs text-emerald-300 font-mono font-bold">
            <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>{ramNotification}</span>
          </div>
          <span className="text-[10px] bg-emerald-400 text-black px-2 py-0.5 rounded font-mono font-bold">
            OPTIMIZED
          </span>
        </div>
      )}

      {/* Remote Important Update Notice (if active in cloudConfig) */}
      {cloudBackend.remoteConfig.hasImportantUpdate && (
        <div className="p-2.5 rounded-2xl bg-cyan-950/90 border border-cyan-400/70 text-cyan-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <strong className="block truncate">{cloudBackend.remoteConfig.updateTitle || 'Cloud Profile Update'}</strong>
              <span className="text-[10px] text-cyan-300/80 block truncate">{cloudBackend.remoteConfig.updateMessage}</span>
            </div>
          </div>
          <span className="text-[9px] font-mono bg-cyan-400 text-black font-bold px-2 py-0.5 rounded shrink-0">
            {cloudBackend.remoteConfig.configVersion}
          </span>
        </div>
      )}

      {/* User Payment Notification Alert */}
      {userPaymentNotification && (
        <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
          userPaymentNotification.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200' 
            : userPaymentNotification.type === 'error'
            ? 'bg-red-950/80 border-red-400 text-red-200'
            : 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
        }`}>
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{userPaymentNotification.message}</span>
          </div>
          <button
            onClick={clearPaymentNotification}
            className="text-[11px] underline opacity-80 hover:opacity-100 font-mono cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Hero: Anime Character with White Hair + Blue Crown + Black Mask */}
      <div className="relative flex flex-col items-center pt-1 pb-1">
        <div className="absolute top-2 w-44 h-44 rounded-full bg-cyan-500/20 blur-3xl -z-10 pointer-events-none" />
        
        <div className="relative group cursor-pointer" onClick={handleLogoTap}>
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl p-1 bg-gradient-to-b from-cyan-400 via-blue-600 to-transparent shadow-xl shadow-cyan-500/30 overflow-hidden relative border border-cyan-400/50">
            <img 
              src="/assets/anime_hero.png" 
              alt="Cyber Gaming Hero" 
              className="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/character_home.png';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050A1A] via-transparent to-transparent opacity-60" />
          </div>
          <div className="absolute -inset-1 rounded-2xl border border-cyan-400/40 opacity-75 blur-xs pointer-events-none animate-pulse" />
        </div>

        {/* Title: GLOBAL GAME BOOSTER (5-Tap Admin Trigger) */}
        <div className="mt-2 text-center cursor-pointer select-none" onClick={handleLogoTap}>
          <h1 className="font-orbitron font-black text-2xl sm:text-3xl tracking-tight italic bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,191,255,0.7)]">
            GLOBAL GAME
          </h1>
          <div className="font-orbitron font-extrabold text-2xl sm:text-3xl tracking-wider italic text-cyan-400 -mt-1 drop-shadow-[0_0_20px_rgba(0,229,255,0.9)]">
            BOOSTER
          </div>

          <div className="flex items-center justify-center space-x-1.5 mt-0.5 text-xs text-amber-300 font-semibold tracking-wide">
            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
            <span className="font-rajdhani text-sm uppercase tracking-wider text-amber-300">
              {state.language === 'ur' ? 'One Booster. All Your Games.' : 'ONE BOOSTER. ALL YOUR GAMES.'}
            </span>
            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
          </div>
        </div>
      </div>

      {/* UNIFIED ONE-TAP SUPER BOOST MASTER CONTROL (Top: Boost Details, Middle: BOOST Button) */}
      <OneTapBoostButton />

      {/* 3 HONEST FPS CARDS */}
      <div className="space-y-1.5 pt-1">
        <div className="grid grid-cols-3 gap-2">
          {/* 60 FPS Smooth */}
          <div
            onClick={() => handleFpsCardClick('60')}
            className={`cursor-pointer rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition-all relative ${
              state.activeFps === '60' && state.isBoosting
                ? 'bg-[#031c12] border-2 border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.6)]'
                : 'bg-[#06141a]/90 border border-emerald-900/60 hover:border-emerald-600/70'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center mb-1 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <Gauge className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-orbitron font-extrabold text-sm text-emerald-300">
              60 FPS
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold leading-tight">
              Smooth
            </span>
            <span className="text-[9px] text-slate-300 leading-tight mt-0.5">
              Best for 4GB RAM
            </span>
            <span className="text-[9px] text-emerald-400/80 font-mono mt-0.5">
              30 Min • Free
            </span>
            {state.activeFps === '60' && state.isBoosting && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          {/* 90 FPS Ultra */}
          <div
            onClick={() => handleFpsCardClick('90')}
            className={`cursor-pointer rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition-all relative ${
              state.activeFps === '90' && state.isBoosting
                ? 'bg-[#041a33] border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.65)]'
                : 'bg-[#051124]/90 border border-cyan-900/60 hover:border-cyan-600/70'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center mb-1 shadow-[0_0_10px_rgba(6,182,212,0.4)]">
              <Gauge className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="font-orbitron font-extrabold text-sm text-cyan-300">
              90 FPS
            </span>
            <span className="text-[10px] text-cyan-400 font-semibold leading-tight">
              Ultra
            </span>
            <span className="text-[9px] text-slate-300 leading-tight mt-0.5">
              If Supported
            </span>
            <span className="text-[9px] text-cyan-400/80 font-mono mt-0.5">
              60 Min • Free
            </span>
            {state.activeFps === '90' && state.isBoosting && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            )}
          </div>

          {/* 120 FPS Extreme */}
          <div
            onClick={() => handleFpsCardClick('120')}
            className={`cursor-pointer rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition-all relative ${
              state.activeFps === '120' && state.isBoosting
                ? 'bg-[#26051f] border-2 border-pink-500 shadow-[0_0_22px_rgba(236,72,153,0.65)]'
                : 'bg-[#18081a]/90 border border-pink-900/60 hover:border-pink-600/70'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-pink-950/80 border border-pink-500/40 flex items-center justify-center mb-1 shadow-[0_0_10px_rgba(236,72,153,0.4)] relative">
              <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
            </div>
            <span className="font-orbitron font-extrabold text-sm text-pink-300">
              120 FPS
            </span>
            <span className="text-[10px] text-pink-400 font-bold leading-tight">
              Extreme
            </span>
            <span className="text-[9px] text-slate-300 leading-tight mt-0.5">
              If 120Hz Supported
            </span>
            <span className="text-[9px] text-pink-400/90 font-mono mt-0.5">
              120 Min • Free
            </span>
            {state.activeFps === '120' && state.isBoosting && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-pink-400 animate-ping" />
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-400 text-center font-mono px-1">
          FPS depends on your device hardware. Optimizes for best FPS your device supports.
        </p>
      </div>

      {/* Bottom Live Hardware Stats Bar (RAM, Real Storage, Bottleneck Status) */}
      <div className="pt-1">
        <div className="p-3 rounded-2xl bg-[#071129]/90 border border-cyan-900/60 shadow-xl shadow-black/80 space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-cyan-950/80">
            <span className="text-[11px] font-orbitron font-semibold text-slate-300 flex items-center space-x-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>REAL-TIME HARDWARE TELEMETRY</span>
            </span>
            <button
              type="button"
              onClick={() => {
                haptics.impactLight();
                sound.playClick();
                refreshHardwareTelemetry();
              }}
              className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1 cursor-pointer hover:text-emerald-300"
              title="Refresh Hardware Telemetry"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE</span>
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-center">
            <div className="grid grid-cols-3 gap-1.5">
              {/* FPS */}
              <div className="bg-[#050b1a] p-2 rounded-xl border border-cyan-950 flex flex-col justify-center">
                <span className="text-[9px] text-slate-400 block font-mono">{`FPS (${state.maxHardwareHz}Hz)`}</span>
                <span id="fps" className="font-orbitron font-extrabold text-sm text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]">
                  {String(state.currentFps)}
                </span>
              </div>

              {/* RAM - Real MemoryInfo */}
              <div 
                onClick={() => {
                  haptics.impactLight();
                  sound.playClick();
                  refreshHardwareTelemetry();
                }} 
                className="bg-[#050b1a] p-2 rounded-xl border border-cyan-950 cursor-pointer hover:border-cyan-500/50 transition-colors flex flex-col justify-center"
                title="Tap to Refresh RAM Telemetry"
              >
                <div className="flex items-center justify-center space-x-0.5">
                  <span className="text-[9px] text-slate-400 font-mono">RAM</span>
                  <RotateCcw className="w-2 h-2 text-cyan-400" />
                </div>
                <span id="ram" className="font-orbitron font-extrabold text-[11px] text-emerald-400 block whitespace-nowrap">
                  {`${Number(state.ramUsedGb).toFixed(1)} / ${Number(state.totalRamGb).toFixed(1)} GB`}
                </span>
                <span id="ramPercent" className="text-[8px] text-slate-400 block -mt-0.5">{`${state.ramUsagePercent}% Used`}</span>
              </div>

              {/* Temp */}
              <div className="bg-[#050b1a] p-2 rounded-xl border border-cyan-950 flex flex-col justify-center">
                <span className="text-[9px] text-slate-400 block font-mono">TEMP</span>
                <span
                  id="temp"
                  className={`font-orbitron font-extrabold text-sm block tabular-nums ${
                    state.temperatureC >= (state.thermalAlertThresholdC ?? 41) + 3
                      ? 'text-red-400'
                      : state.temperatureC >= (state.thermalAlertThresholdC ?? 41)
                      ? 'text-orange-400'
                      : 'text-amber-400'
                  }`}
                >
                  {`${Number(state.temperatureC).toFixed(1)}°C`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {/* Battery */}
              <div className="bg-[#050b1a] p-2 rounded-xl border border-cyan-950 flex items-center justify-between px-3">
                <span className="text-[9px] text-slate-400 font-mono">BATTERY</span>
                <span id="battery" className="font-orbitron font-extrabold text-xs text-emerald-300">
                  {`${state.batteryLevel ?? 88}%${state.isBatteryCharging ? ' ⚡' : ''}`}
                </span>
              </div>

              {/* Ping */}
              <div className="bg-[#050b1a] p-2 rounded-xl border border-cyan-950 flex items-center justify-between px-3">
                <span className="text-[9px] text-slate-400 font-mono">PING</span>
                <span className={`font-orbitron font-extrabold text-xs tabular-nums ${state.isOnline === false ? 'text-red-400' : 'text-cyan-400'}`}>
                  {state.isOnline === false ? 'Offline' : state.pingMs > 0 ? `${state.pingMs}ms` : 'Probing...'}
                </span>
              </div>
            </div>

            {/* Real Storage & Permission-Gated App Temp Cache Bar */}
            <div className="bg-[#050b1a] p-2.5 rounded-xl border border-cyan-950 flex items-center justify-between gap-2 text-left">
              <div className="flex items-center space-x-2 min-w-0">
                <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-orbitron font-bold text-slate-200 block">
                    Storage: {Number(state.storage?.freeGb ?? 28.4).toFixed(1)} / {Number(state.storage?.totalGb ?? 64).toFixed(1)} GB Free
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 block truncate">
                    App Temp Cache: {state.storage?.appTempCacheKb ?? 0} KB
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  haptics.impactLight();
                  sound.playClick();
                  setShowCacheConfirmModal(true);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-950/90 border border-cyan-600/60 hover:border-cyan-400 text-cyan-300 text-[10px] font-mono font-bold flex items-center space-x-1 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Cache</span>
              </button>
            </div>

            {/* Real Bottleneck & Supported FPS Recommendation Banner */}
            <div className={`p-2 rounded-xl border text-left flex items-center justify-between gap-2 ${
              bottleneckReport.level === 'critical'
                ? 'bg-red-950/50 border-red-500/60 text-red-200'
                : bottleneckReport.level === 'warning'
                ? 'bg-amber-950/50 border-amber-500/60 text-amber-200'
                : 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
            }`}>
              <div className="flex items-center space-x-2 min-w-0">
                {bottleneckReport.level === 'optimal' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${bottleneckReport.level === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
                )}
                <span className="text-[10px] font-mono leading-tight truncate">
                  {bottleneckReport.summary}
                </span>
              </div>
              {bottleneckReport.level !== 'optimal' && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    applyOptimizationProfile(bottleneckReport.recommendedProfile);
                  }}
                  className="px-2 py-1 rounded-lg bg-amber-400 text-black text-[9px] font-orbitron font-bold whitespace-nowrap cursor-pointer shrink-0"
                >
                  Use {bottleneckReport.recommendedFps} FPS
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Secret Admin PIN Modal (Triggered by 5-Tap on Logo) */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-[#071333] border border-amber-500/60 rounded-3xl p-5 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400 flex items-center justify-center mx-auto text-amber-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="font-orbitron font-bold text-sm text-white">Admin Security Access</h3>
            <p className="text-[11px] text-slate-300">Enter Admin PIN to open Diagnostics &amp; Cloud Portal</p>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="Enter PIN"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-mono py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-white focus:outline-none focus:border-amber-400"
              />
              {pinError && (
                <p className="text-red-400 text-[10px] font-mono">Incorrect PIN!</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPinModal(false)}
                  className="py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold font-orbitron"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 rounded-xl bg-amber-400 text-black text-xs font-bold font-orbitron shadow-md shadow-amber-400/30"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Explicit User Permission Confirmation Modal for App Cache Cleanup */}
      {showCacheConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-[#071333] border border-cyan-500/60 rounded-3xl p-5 shadow-2xl space-y-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center mx-auto text-cyan-300">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-orbitron font-bold text-sm text-white">Clear Temporary App Cache?</h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              This will safely remove <strong className="text-cyan-300">{state.storage?.appTempCacheKb ?? 0} KB</strong> of temporary cache files inside Global Game Booster only. Your settings, active boost countdown, and other apps remain untouched.
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
                className="py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold font-orbitron shadow-md shadow-cyan-400/30 cursor-pointer"
              >
                Confirm Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Admin Portal */}
      {isAdminOpen && (
        <Suspense fallback={null}>
          <AdminPanel onClose={() => setIsAdminOpen(false)} />
        </Suspense>
      )}
    </div>
  );
};
