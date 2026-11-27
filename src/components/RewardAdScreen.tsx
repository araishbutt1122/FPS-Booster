import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Clock,
  Check,
  Zap,
  ShieldCheck,
  Tv,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { AdRewardOption, OptimizationProfileMode } from '../types.ts';
import { sound } from '../utils/audio.ts';
import { haptics } from '../utils/haptics.ts';
import {
  ADMOB_CONFIG,
  OPTIMIZATION_PROFILES,
  showNativeRewardedAd,
} from '../utils/gamingEngine.ts';
import { GameLibrary } from './GameLibrary.tsx';

const SECONDS_PER_AD = 4;

export const RewardAdScreen: React.FC = () => {
  const {
    adOptions,
    grantAdBoostTime,
    refreshHardwareTelemetry,
    applyOptimizationProfile,
    cloudBackend,
    state,
    masterBoostActive,
    setCurrentScreen,
  } = useBooster();

  const [selectedOption, setSelectedOption] = useState<AdRewardOption>(
    adOptions.find((o) => o.isRecommended) || adOptions[0]
  );

  // Interactive Ad Player State
  const [activeAdOption, setActiveAdOption] = useState<AdRewardOption | null>(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(1);
  const [adSecRemaining, setAdSecRemaining] = useState(SECONDS_PER_AD);
  const [isPageHidden, setIsPageHidden] = useState(
    typeof document !== 'undefined' ? document.hidden : false
  );
  const [rewardBanner, setRewardBanner] = useState<{
    title: string;
    subtitle: string;
  } | null>(null);

  useEffect(() => {
    const onVis = () => {
      setIsPageHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const completeAdReward = useCallback(
    (option: AdRewardOption) => {
      haptics.success();
      sound.playSuccess();
      refreshHardwareTelemetry();
      grantAdBoostTime(option.durationMinutes, option.adsCount, option.label);
      setRewardBanner({
        title: `+${option.durationMinutes} Min Boost Started!`,
        subtitle: `Countdown live & Master Boost ON (${option.adsCount} Ad${
          option.adsCount > 1 ? 's' : ''
        } completed).`,
      });
    },
    [grantAdBoostTime, refreshHardwareTelemetry]
  );

  useEffect(() => {
    if (!activeAdOption || isPageHidden) return;

    const totalAds = activeAdOption.adsCount;

    const iv = setInterval(() => {
      setAdSecRemaining((prev) => {
        if (prev > 1) return prev - 1;

        if (currentAdIndex < totalAds) {
          setCurrentAdIndex((idx) => idx + 1);
          return SECONDS_PER_AD;
        }

        const finishedOption = activeAdOption;
        setActiveAdOption(null);
        completeAdReward(finishedOption);
        return 0;
      });
    }, 1000);

    return () => clearInterval(iv);
  }, [activeAdOption, currentAdIndex, isPageHidden, completeAdReward]);

  const startAdFlow = async (option: AdRewardOption) => {
    if (activeAdOption) return;
    haptics.impactMedium();
    sound.playClick();
    setRewardBanner(null);

    const nativeAttempt = await showNativeRewardedAd();
    if (nativeAttempt.handledNatively) {
      if (nativeAttempt.rewarded) {
        completeAdReward(option);
      }
      return;
    }

    setCurrentAdIndex(1);
    setAdSecRemaining(SECONDS_PER_AD);
    setActiveAdOption(option);
  };

  const formatCountdown = (totalSec: number) => {
    const s = Math.max(0, Math.floor(totalSec));
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const rem = s % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${rem
      .toString()
      .padStart(2, '0')}`;
  };

  const remainingSec = Math.max(0, state.boostTimeRemainingSec || 0);
  const isPlayingAd = activeAdOption !== null;
  const modalTotalAds = activeAdOption?.adsCount || 1;
  const totalAdSeconds = modalTotalAds * SECONDS_PER_AD;
  const elapsedAdSeconds =
    (currentAdIndex - 1) * SECONDS_PER_AD +
    (SECONDS_PER_AD - adSecRemaining);
  const adProgressPct = isPlayingAd
    ? Math.min(100, Math.round((elapsedAdSeconds / totalAdSeconds) * 100))
    : 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 pt-1 space-y-4">
      {/* Top Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 p-4 bg-gradient-to-r from-[#062118] via-[#041a13] to-[#070b1f] shadow-xl shadow-emerald-950/40 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Tv className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Ad Boost &amp; Game Center</span>
          </div>
          <h2 className="font-orbitron font-extrabold text-base sm:text-lg text-white leading-tight">
            100% Free Ad-Supported Booster
          </h2>
          <p className="text-[11px] text-emerald-200/85 mt-1 leading-snug">
            Watch a quick ad to start your Boost countdown immediately, pick your Optimization Mode, and launch your installed game.
          </p>
          <span className="text-[9px] font-mono text-emerald-300/75 block mt-1">
            Ad Unit: {ADMOB_CONFIG.REWARDED_ID}
          </span>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/30 border border-emerald-400/50 flex items-center justify-center relative shadow-lg shadow-emerald-500/20 shrink-0">
          <Zap className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
        </div>
      </div>

      {/* Live Expiration Countdown Card */}
      <div
        className={`p-3.5 rounded-2xl border shadow-lg flex items-center justify-between gap-2 ${
          masterBoostActive && remainingSec > 0
            ? 'bg-gradient-to-r from-emerald-950/85 to-cyan-950/85 border-emerald-400/70'
            : remainingSec > 0
            ? 'bg-[#071530] border-cyan-500/60'
            : 'bg-[#120d1f] border-amber-500/50'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              masterBoostActive && remainingSec > 0
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : remainingSec > 0
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-amber-500/20 border-amber-400 text-amber-300'
            }`}
          >
            <Clock
              className={`w-5 h-5 ${
                masterBoostActive && remainingSec > 0 ? 'animate-pulse' : ''
              }`}
            />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-300 font-mono font-bold block uppercase">
              {masterBoostActive && remainingSec > 0
                ? 'BOOST ON — LIVE COUNTDOWN'
                : remainingSec > 0
                ? 'BOOST COUNTDOWN ACTIVE'
                : 'BOOST OFF — 00:00'}
            </span>
            <span className="font-orbitron font-extrabold text-lg text-white tabular-nums block">
              {remainingSec > 0 ? formatCountdown(remainingSec) : '00:00'}
            </span>
            <span className="text-[10px] text-cyan-300 font-mono block">
              Ads Completed: {state.totalAdsWatched ?? 0} · Auto-stops at 00:00
            </span>
          </div>
        </div>

        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full font-mono uppercase shrink-0 ${
            masterBoostActive && remainingSec > 0
              ? 'bg-emerald-500 text-black'
              : remainingSec > 0
              ? 'bg-cyan-400 text-black'
              : 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
          }`}
        >
          {masterBoostActive && remainingSec > 0
            ? 'BOOST ON'
            : remainingSec > 0
            ? 'COUNTING'
            : 'WATCH AD'}
        </span>
      </div>

      {/* Reward Granted Confirmation Banner */}
      {rewardBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/75 border border-emerald-400/70 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-orbitron font-bold text-xs text-white">
                {rewardBanner.title}
              </div>
              <p className="text-[10px] font-mono text-emerald-200">
                {rewardBanner.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              haptics.impactLight();
              sound.playClick();
              setCurrentScreen('home');
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-400 text-black font-orbitron font-bold text-[10px] uppercase shrink-0 cursor-pointer flex items-center space-x-1"
          >
            <span>Boost</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Section 1: Ad Boost Time */}
      <div className="bg-[#071129]/90 border border-cyan-900/50 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-950">
          <h3 className="font-orbitron font-bold text-xs text-cyan-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>1. Ad Boost Time</span>
          </h3>
          <span className="text-[10px] text-emerald-400 font-mono">
            Starts Boost Immediately
          </span>
        </div>

        <div className="space-y-2">
          {adOptions.map((opt) => {
            const isSelected = selectedOption.id === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                disabled={isPlayingAd}
                onClick={() => {
                  haptics.selection();
                  sound.playClick();
                  setSelectedOption(opt);
                }}
                className={`w-full p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all text-left disabled:opacity-60 ${
                  isSelected
                    ? 'bg-cyan-950/45 border-cyan-400 shadow-[0_0_15px_rgba(0,191,255,0.3)]'
                    : 'bg-[#050c1f] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-orbitron font-bold text-xs text-slate-100 block truncate">
                      {opt.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      {opt.adsCount} ad{opt.adsCount > 1 ? 's' : ''} (~{opt.adsCount * SECONDS_PER_AD}s) • {opt.durationMinutes}m live boost
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {opt.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        opt.badge === 'RECOMMENDED'
                          ? 'bg-amber-400 text-black'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}

                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-400'
                        : 'border-slate-600'
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 text-black stroke-[3]" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => startAdFlow(selectedOption)}
          disabled={isPlayingAd}
          className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-black font-orbitron font-extrabold text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:shadow-[0_0_35px_rgba(16,185,129,0.75)] transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-98 disabled:opacity-60"
        >
          <Play className="w-4 h-4 fill-black shrink-0" />
          <span>
            Watch {selectedOption.adsCount} Ad{selectedOption.adsCount > 1 ? 's' : ''} → Start {selectedOption.durationMinutes}m Boost
          </span>
        </button>
      </div>

      {/* Shifted from Boost Screen: Optimization Modes + Smart Game Library */}
      <div className="p-3.5 rounded-2xl bg-[#071129]/90 border border-cyan-900/60 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-orbitron font-bold text-cyan-300 uppercase tracking-wider flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Optimization Modes</span>
          </span>
          <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-700/50 px-1.5 py-0.5 rounded">
            {state.activeProfile.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5">
          {(cloudBackend.remoteProfiles.length > 0 ? cloudBackend.remoteProfiles : OPTIMIZATION_PROFILES).map((prof) => {
            const active = state.activeProfile === prof.id;
            return (
              <button
                key={prof.id}
                type="button"
                onClick={() => {
                  haptics.selection();
                  applyOptimizationProfile(prof.id as OptimizationProfileMode);
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-mono font-bold whitespace-nowrap cursor-pointer transition-all shrink-0 ${
                  active
                    ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                    : 'bg-[#040c1f] text-slate-300 border-slate-800 hover:border-cyan-700'
                }`}
              >
                {prof.name}
              </button>
            );
          })}
        </div>

        <GameLibrary />
      </div>

      {/* Return to Master Boost */}
      <button
        type="button"
        onClick={() => {
          haptics.impactLight();
          sound.playClick();
          setCurrentScreen('home');
        }}
        className="w-full min-h-[44px] py-2.5 rounded-2xl bg-[#071636] border border-cyan-500/50 text-cyan-200 hover:text-white font-orbitron font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer"
      >
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span>
          {remainingSec > 0
            ? `Return to Master Boost (${formatCountdown(remainingSec)} Left)`
            : 'Back to Home Screen'}
        </span>
      </button>

      {/* Interactive Rewarded Ad Playback Modal */}
      {isPlayingAd && activeAdOption && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Watching Rewarded Ad"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#061129] border-2 border-emerald-400/70 p-5 shadow-[0_0_45px_rgba(16,185,129,0.35)] space-y-4 text-center">
            <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
              <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700/60 font-bold">
                REWARDED AD {currentAdIndex} / {modalTotalAds}
              </span>
              <span className="text-emerald-300 font-bold tabular-nums">
                {isPageHidden ? 'PAUSED' : `${adSecRemaining}s remaining`}
              </span>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[#081d3f] via-[#05122b] to-[#04231c] border border-cyan-500/40 p-5 space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mx-auto text-emerald-300">
                <Tv className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-orbitron font-extrabold text-sm text-white">
                {`Starting ${activeAdOption.durationMinutes} Min Boost Session`}
              </h3>
              <p className="text-[11px] font-mono text-slate-300">
                {isPageHidden
                  ? 'Ad paused while tab is backgrounded — return to resume.'
                  : 'Keep this window open until completion to start your live Boost countdown.'}
              </p>
              {isPageHidden && (
                <div className="flex items-center justify-center space-x-1 text-amber-300 text-[10px] font-mono">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Timer Paused</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 rounded-full bg-slate-900 border border-cyan-900 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500"
                  style={{ width: `${adProgressPct}%` }}
                />
              </div>
              <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                Reward Progress: {adProgressPct}% • Unit {ADMOB_CONFIG.REWARDED_ID.slice(-10)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
