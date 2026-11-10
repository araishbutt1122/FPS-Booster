import React, { useState, useRef } from 'react';
import { 
  Gamepad2, 
  Gauge, 
  Crown, 
  ShieldCheck, 
  Zap, 
  Flame, 
  Play, 
  Gift, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  Info,
  Layers,
  RotateCcw,
  KeyRound
} from 'lucide-react';
import { useBooster, REWARDED_AD_ID } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { FPSMode } from '../types.ts';
import { AdModal } from './AdModal.tsx';
import { AdminPanel } from './AdminPanel.tsx';

interface PendingAdTask {
  targetFps?: FPSMode;
  label: string;
  durationMinutes: number;
  totalAdsNeeded: number;
  currentAdIndex: number;
}

export const HomeScreen: React.FC = () => {
  const { 
    state, 
    toggleGamingMode, 
    cleanRam, 
    startRewardBoost, 
    tapToBoost,
    setCurrentScreen,
    userPaymentNotification,
    clearPaymentNotification,
    snackBarMessage,
    setSnackBarMessage
  } = useBooster();

  const [isBoostingAnim, setIsBoostingAnim] = useState(false);
  const [ramNotification, setRamNotification] = useState<string | null>(null);
  const [activeAdTask, setActiveAdTask] = useState<PendingAdTask | null>(null);

  // Hidden 5-tap logo admin trigger
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const logoTapRef = useRef({ count: 0, lastTime: 0 });

  const handleLogoTap = () => {
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
      sound.playSuccess();
      setShowAdminPinModal(false);
      setAdminPin('');
      setPinError(false);
      setIsAdminOpen(true);
    } else {
      sound.playClick();
      setPinError(true);
    }
  };

  // TAP TO BOOST
  const handleCenterBoostClick = () => {
    sound.playClick();
    setIsBoostingAnim(true);

    if (state.isPro) {
      sound.playBoost();
      const { freedMb } = cleanRam();
      tapToBoost();
      setRamNotification(`⚡ PRO Turbo Boosted! Freed ${freedMb}MB RAM`);
      setTimeout(() => setIsBoostingAnim(false), 1200);
      setTimeout(() => setRamNotification(null), 3500);
      return;
    }

    if (state.isBoosting) {
      sound.playBoost();
      const { freedMb } = cleanRam();
      tapToBoost();
      setRamNotification(`⚡ Turbo Cleaned! Freed ${freedMb}MB RAM`);
      setTimeout(() => setIsBoostingAnim(false), 1200);
      setTimeout(() => setRamNotification(null), 3500);
      return;
    }

    // Trigger 1 Ad to start 10 Min boost
    setIsBoostingAnim(false);
    setActiveAdTask({
      label: 'Tap to Boost (10 Min)',
      durationMinutes: 10,
      totalAdsNeeded: 1,
      currentAdIndex: 1,
    });
  };

  // 3 FPS CARDS CLICK LOGIC (DIRECT TIMER SYSTEM + STRICT AD GATE)
  const handleFpsCardClick = (mode: FPSMode) => {
    sound.playClick();

    // PRO users activate directly without ads
    if (state.isPro) {
      sound.playBoost();
      const duration = mode === '60' ? 30 : mode === '90' ? 60 : 120;
      startRewardBoost(duration, mode, `${mode} FPS Extreme`);
      setSnackBarMessage(`${mode} FPS Activated - PRO VIP Unlimited!`);
      return;
    }

    // Free users watch required ads to start timer directly
    const durationMinutes = mode === '60' ? 30 : mode === '90' ? 60 : 120;
    const totalAdsNeeded = mode === '60' ? 1 : mode === '90' ? 2 : 3;

    setActiveAdTask({
      targetFps: mode,
      label: `${mode} FPS Extreme Mode`,
      durationMinutes,
      totalAdsNeeded,
      currentAdIndex: 1,
    });
  };

  // Direct Ad Earn Trigger from 4 Cards or Quick Ad Card
  const startDirectAdTask = (minutes: number, adsNeeded: number, label: string) => {
    sound.playClick();
    setActiveAdTask({
      label,
      durationMinutes: minutes,
      totalAdsNeeded: adsNeeded,
      currentAdIndex: 1,
    });
  };

  // Single Ad Finished in the sequence
  const handleSingleAdSuccess = () => {
    if (!activeAdTask) return;

    if (activeAdTask.currentAdIndex < activeAdTask.totalAdsNeeded) {
      // Progress to next ad: "Ad 1/2 Done - Watch 1 More..."
      const nextIndex = activeAdTask.currentAdIndex + 1;
      setSnackBarMessage(`Ad ${activeAdTask.currentAdIndex}/${activeAdTask.totalAdsNeeded} Done - Watch 1 More...`);
      setActiveAdTask({
        ...activeAdTask,
        currentAdIndex: nextIndex,
      });
    } else {
      // All ads completed! Start Timer Immediately!
      const duration = activeAdTask.durationMinutes;
      const fps = activeAdTask.targetFps || (duration >= 120 ? '120' : duration >= 60 ? '90' : '60');
      
      startRewardBoost(duration, fps, activeAdTask.label);
      setActiveAdTask(null);
    }
  };

  // STRICT RULE: If Ad skipped, failed, or cancelled mid-way
  const handleAdSkippedOrFailed = () => {
    setActiveAdTask(null);
    sound.playClick();
    setSnackBarMessage('Ad Not Completed - Watch Again');
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-20 pt-1 space-y-3.5">
      {/* Toast / SnackBar Notification */}
      {snackBarMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-cyan-950 to-blue-950 border border-cyan-400 text-cyan-200 px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl shadow-cyan-900/60 flex items-center space-x-2 animate-bounce">
          {snackBarMessage.includes('Activated') || snackBarMessage.includes('Started') || snackBarMessage.includes('Verified') ? (
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

        {/* Title: FPS BOOSTER PRO 120 (5-Tap Admin Trigger) */}
        <div className="mt-2 text-center cursor-pointer select-none" onClick={handleLogoTap}>
          <h1 className="font-orbitron font-black text-2xl sm:text-3xl tracking-tight italic bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,191,255,0.7)]">
            FPS BOOSTER
          </h1>
          <div className="font-orbitron font-extrabold text-2xl sm:text-3xl tracking-wider italic text-cyan-400 -mt-1 drop-shadow-[0_0_20px_rgba(0,229,255,0.9)]">
            PRO 120
          </div>

          <div className="flex items-center justify-center space-x-1.5 mt-0.5 text-xs text-amber-300 font-semibold tracking-wide">
            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
            <span className="font-rajdhani text-sm uppercase tracking-wider text-amber-300">
              {state.language === 'ur' ? 'Pro Ki Tarah Game Khelo' : 'Game Like a Pro'}
            </span>
            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
          </div>
        </div>
      </div>

      {/* Center: Big Circular Neon Button "Tap to Boost" with Gamepad Icon */}
      <div className="flex flex-col items-center justify-center py-1 relative">
        <div className="relative flex items-center justify-center">
          <div className={`absolute w-44 h-44 rounded-full border border-cyan-500/30 ${isBoostingAnim ? 'animate-ping' : 'animate-pulse'}`} />
          <div className="absolute w-40 h-40 rounded-full border border-cyan-400/40 blur-xs" />
          
          <button
            onClick={handleCenterBoostClick}
            className={`w-36 h-36 rounded-full relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
              isBoostingAnim 
                ? 'scale-95 shadow-[0_0_60px_rgba(0,229,255,1)]' 
                : 'hover:scale-105 shadow-[0_0_35px_rgba(0,191,255,0.6)] active:scale-95'
            } bg-gradient-to-b from-[#0a1a3a] via-[#040e24] to-[#010816] border-2 border-cyan-400`}
            style={{
              boxShadow: '0 0 30px rgba(0, 191, 255, 0.5), inset 0 0 25px rgba(0, 191, 255, 0.4)',
            }}
          >
            <div className="absolute inset-1 rounded-full border-2 border-dashed border-cyan-400/40 animate-[spin_12s_linear_infinite]" />

            <div className="relative mb-1">
              <Gamepad2 className="w-10 h-10 text-cyan-300 drop-shadow-[0_0_12px_rgba(0,229,255,0.9)]" />
              {isBoostingAnim && (
                <Zap className="w-6 h-6 text-amber-300 absolute -top-1 -right-2 animate-bounce fill-amber-300" />
              )}
            </div>

            <span className="font-orbitron font-bold text-xs tracking-wider text-white uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              {isBoostingAnim ? 'BOOSTING...' : 'Tap to Boost'}
            </span>
            <span className="text-[9px] text-cyan-400 font-mono tracking-widest mt-0.5 uppercase">
              {state.isBoosting ? `${state.activeFps} FPS ACTIVE` : (state.isPro ? 'PRO VIP READY' : 'INSTANT BOOST')}
            </span>
          </button>
        </div>

        {/* Gaming Mode Toggle Pill */}
        <div className="mt-3 flex items-center justify-between w-64 px-4 py-2 rounded-full bg-[#0a1633] border border-cyan-800/60 shadow-lg shadow-black/60">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${state.isGamingModeOn ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'bg-slate-600'}`} />
            <span className="font-orbitron text-xs font-bold tracking-wide text-slate-200">
              Gaming Mode
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${state.isGamingModeOn ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-400 bg-slate-900'}`}>
              {state.isGamingModeOn ? 'ON' : 'OFF'}
            </span>
          </div>

          <button
            onClick={toggleGamingMode}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
              state.isGamingModeOn ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]' : 'bg-slate-700'
            }`}
          >
            <div 
              className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                state.isGamingModeOn ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* BIG VISIBLE AD CARD DIRECTLY UNDER TAP TO BOOST */}
      {/* [🎁 WATCH AD - GET FREE BOOST - 1 Ad = 10 Min] [Button: Watch Ad Now - Yellow/Gold] */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1f1604] via-[#241a05] to-[#120e03] border-2 border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.35)] flex items-center justify-between">
        <div className="flex items-center space-x-2.5 max-w-[62%]">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/60 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
            <Gift className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-orbitron font-extrabold text-xs text-white uppercase tracking-tight">
              WATCH AD - GET FREE BOOST
            </h4>
            <p className="text-[10px] text-amber-300 font-mono font-semibold">
              1 Ad = 10 Min Direct Boost
            </p>
          </div>
        </div>

        <button
          onClick={() => startDirectAdTask(10, 1, 'Quick 10 Min Boost')}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-orbitron font-extrabold text-[11px] uppercase tracking-wider shadow-lg shadow-amber-400/40 hover:brightness-110 active:scale-95 transition-all flex items-center space-x-1 cursor-pointer"
        >
          <span>Watch Ad Now</span>
          <Play className="w-3 h-3 fill-black" />
        </button>
      </div>

      {/* 3 FPS CARDS (SAME DESIGN, SAME LOCATION) */}
      {/* Below Gaming Mode: 60 FPS Smooth (Green), 90 FPS Ultra (Blue), 120 FPS Extreme (Pink Crown) */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {/* 60 FPS Smooth - Green - 1 Ad -> 30 Min Timer START */}
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
          <span className="text-[10px] text-emerald-400 font-medium tracking-tight">
            Smooth
          </span>
          <span className="text-[9px] text-emerald-400/80 font-mono mt-0.5">
            30 Min • 1 Ad
          </span>
          {state.activeFps === '60' && state.isBoosting && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </div>

        {/* 90 FPS Ultra - Blue - 2 Ads -> 60 Min Timer START */}
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
          <span className="text-[10px] text-cyan-400 font-medium tracking-tight">
            Ultra
          </span>
          <span className="text-[9px] text-cyan-400/80 font-mono mt-0.5">
            60 Min • 2 Ads
          </span>
          {state.activeFps === '90' && state.isBoosting && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          )}
        </div>

        {/* 120 FPS Extreme - Pink Crown - 3 Ads -> 120 Min Timer START */}
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
          <span className="text-[10px] text-pink-400 font-bold tracking-tight">
            Extreme
          </span>
          <span className="text-[9px] text-pink-400/90 font-mono mt-0.5">
            120 Min • 3 Ads
          </span>
          {state.activeFps === '120' && state.isBoosting && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-pink-400 animate-ping" />
          )}
        </div>
      </div>

      {/* 4 AD CARDS: DIRECT BOOST TIMER ACTIVATION */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-orbitron font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Gift className="w-4 h-4 text-amber-400" />
            <span>🎁 FREE BOOST - WATCH AD</span>
          </span>
          <button 
            onClick={() => { sound.playClick(); setCurrentScreen('reward_ad'); }}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-semibold cursor-pointer"
          >
            Earn Boost &gt;
          </button>
        </div>

        {/* 4 Cards in 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* CARD 1: Yellow - Watch Ad - Get 10 Min Boost - Button [WATCH] */}
          <div
            onClick={() => startDirectAdTask(10, 1, 'Watch Ad (+10 Min Boost)')}
            className="p-2.5 rounded-xl bg-[#1c1803]/90 border border-yellow-500/50 hover:border-yellow-400 transition-all cursor-pointer flex items-center justify-between group hover:shadow-lg hover:shadow-yellow-950"
          >
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-yellow-500/20 border border-yellow-400 flex items-center justify-center text-xs font-bold text-yellow-400 shadow-md">
                <Play className="w-3.5 h-3.5 fill-yellow-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-yellow-300 transition-colors leading-tight">
                  Watch Ad
                </h4>
                <p className="text-[9px] text-yellow-400 font-mono">+10 Min Boost</p>
              </div>
            </div>
            <button className="text-[10px] bg-yellow-400 text-black font-bold px-2 py-1 rounded font-mono uppercase shadow-sm cursor-pointer">
              WATCH
            </button>
          </div>

          {/* CARD 2: Orange - Rewarded Ad - Get 30 Min Boost - Button [EARN] */}
          <div
            onClick={() => startDirectAdTask(30, 1, 'Rewarded Ad (+30 Min Boost)')}
            className="p-2.5 rounded-xl bg-[#1f1103]/90 border border-orange-500/50 hover:border-orange-400 transition-all cursor-pointer flex items-center justify-between group hover:shadow-lg hover:shadow-orange-950"
          >
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-400 flex items-center justify-center text-xs font-bold text-orange-400 shadow-md">
                <Gift className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-orange-300 transition-colors leading-tight">
                  Rewarded Ad
                </h4>
                <p className="text-[9px] text-orange-400 font-mono">+30 Min Boost</p>
              </div>
            </div>
            <button className="text-[10px] bg-orange-500 text-black font-bold px-2 py-1 rounded font-mono uppercase shadow-sm cursor-pointer">
              EARN
            </button>
          </div>

          {/* CARD 3: Blue - Turbo Ad - Get 60 Min Boost - Button [BOOST] */}
          <div
            onClick={() => startDirectAdTask(60, 2, 'Turbo Ad (+60 Min Boost, 2 Ads)')}
            className="p-2.5 rounded-xl bg-[#031424]/90 border border-cyan-500/50 hover:border-cyan-400 transition-all cursor-pointer flex items-center justify-between group hover:shadow-lg hover:shadow-cyan-950"
          >
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-xs font-bold text-cyan-400 shadow-md">
                <Zap className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors leading-tight">
                  Turbo Ad
                </h4>
                <p className="text-[9px] text-cyan-400 font-mono">+60 Min (2 Ads)</p>
              </div>
            </div>
            <button className="text-[10px] bg-cyan-400 text-black font-bold px-2 py-1 rounded font-mono uppercase shadow-sm cursor-pointer">
              BOOST
            </button>
          </div>

          {/* CARD 4: Pink - VIP Ad - Get 120 Min Boost - Button [UNLOCK] */}
          <div
            onClick={() => startDirectAdTask(120, 3, 'VIP Ad (+120 Min Boost, 3 Ads)')}
            className="p-2.5 rounded-xl bg-[#1c031c]/90 border border-pink-500/50 hover:border-pink-400 transition-all cursor-pointer flex items-center justify-between group hover:shadow-lg hover:shadow-pink-950"
          >
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-400 flex items-center justify-center text-xs font-bold text-pink-400 shadow-md">
                <Crown className="w-3.5 h-3.5 fill-pink-400 text-pink-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-pink-300 transition-colors leading-tight">
                  VIP Ad
                </h4>
                <p className="text-[9px] text-pink-400 font-mono">+120 Min (3 Ads)</p>
              </div>
            </div>
            <button className="text-[10px] bg-pink-500 text-white font-bold px-2 py-1 rounded font-mono uppercase shadow-sm cursor-pointer">
              UNLOCK
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Live Hardware Stats Bar */}
      <div className="pt-1">
        <div className="p-3 rounded-2xl bg-[#071129]/90 border border-cyan-900/60 shadow-xl shadow-black/80">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-cyan-950/80">
            <span className="text-[11px] font-orbitron font-semibold text-slate-300 flex items-center space-x-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>REAL-TIME HARDWARE TELEMETRY</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>ACTIVE</span>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            {/* FPS */}
            <div className="bg-[#050b1a] p-2 rounded-xl border border-cyan-950">
              <span className="text-[10px] text-slate-400 block font-mono">FPS</span>
              <span className="font-orbitron font-extrabold text-base text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]">
                {state.currentFps}
              </span>
            </div>

            {/* RAM */}
            <div 
              onClick={cleanRam} 
              className="bg-[#050b1a] p-2 rounded-xl border border-cyan-950 cursor-pointer hover:border-emerald-500/50 transition-colors"
              title="Tap to Clean RAM"
            >
              <div className="flex items-center justify-center space-x-0.5">
                <span className="text-[10px] text-slate-400 font-mono">RAM</span>
                <RotateCcw className="w-2.5 h-2.5 text-emerald-400" />
              </div>
              <span className="font-orbitron font-extrabold text-base text-emerald-400">
                {state.ramUsedGb} GB
              </span>
              <span className="text-[8px] text-slate-500 block -mt-0.5">{state.ramUsagePercent}%</span>
            </div>

            {/* Temp */}
            <div className="bg-[#050b1a] p-2 rounded-xl border border-cyan-950">
              <span className="text-[10px] text-slate-400 block font-mono">TEMP</span>
              <span className="font-orbitron font-extrabold text-base text-amber-400">
                {state.temperatureC}°C
              </span>
            </div>

            {/* Ping */}
            <div className="bg-[#050b1a] p-2 rounded-xl border border-cyan-950">
              <span className="text-[10px] text-slate-400 block font-mono">PING</span>
              <span className="font-orbitron font-extrabold text-base text-cyan-400">
                {state.pingMs}ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PRO CARD UNDER STATS */}
      <div 
        onClick={() => {
          sound.playClick();
          setCurrentScreen('premium');
        }}
        className="p-3.5 rounded-2xl bg-gradient-to-r from-[#170a24] via-[#1f0d33] to-[#0c0417] border-2 border-[#FFC107] shadow-[0_0_20px_rgba(255,193,7,0.3)] cursor-pointer hover:scale-[1.01] transition-transform flex items-center justify-between"
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
            <Crown className="w-5 h-5 fill-amber-400 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h4 className="font-orbitron font-extrabold text-xs text-white uppercase tracking-wider">
                UPGRADE TO PRO
              </h4>
              <span className="text-[9px] bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-bold px-1.5 rounded font-mono">
                599 VIP
              </span>
            </div>
            <p className="text-[10px] text-amber-200/90 font-medium">
              Auto Ping + Auto Boost + No Ads • Direct 120 FPS
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-xs text-amber-400 font-bold font-mono shrink-0">
          <span>View Packages</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Strict Rewarded Ad Modal */}
      {activeAdTask && (
        <AdModal
          durationMinutes={activeAdTask.durationMinutes}
          adStep={activeAdTask.currentAdIndex}
          totalAdSteps={activeAdTask.totalAdsNeeded}
          targetLabel={activeAdTask.label}
          onAdCompleted={handleSingleAdSuccess}
          onAdSkippedOrFailed={handleAdSkippedOrFailed}
        />
      )}

      {/* Secret Admin PIN Modal (Triggered by 5-Tap on Logo) */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-[#071333] border border-amber-500/60 rounded-3xl p-5 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400 flex items-center justify-center mx-auto text-amber-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="font-orbitron font-bold text-sm text-white">Admin Security Access</h3>
            <p className="text-[11px] text-slate-300">Enter Admin PIN to open Order Approvals &amp; Wallet</p>

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

      {/* Hidden Admin Portal */}
      {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
    </div>
  );
};
