import React, { useState } from 'react';
import { 
  Gift, 
  Play, 
  Clock, 
  Crown, 
  Sparkles, 
  Check, 
  RotateCcw, 
  ShieldCheck, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { AdRewardOption } from '../types.ts';
import { AdModal } from './AdModal.tsx';
import { sound } from '../utils/audio.ts';

export const RewardAdScreen: React.FC = () => {
  const { 
    adOptions, 
    startRewardBoost, 
    setSnackBarMessage,
    state, 
    setCurrentScreen 
  } = useBooster();

  const [selectedOption, setSelectedOption] = useState<AdRewardOption>(
    adOptions.find(o => o.isRecommended) || adOptions[0]
  );
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [currentAdStep, setCurrentAdStep] = useState(1);

  const handleStartAd = async () => {
    sound.playClick();
    const type = selectedOption.id === 'ad_10m' ? '10m' : 
                 selectedOption.id === 'ad_30m' ? '30m' : 
                 selectedOption.id === 'ad_60m' ? '60m' : '120m';

    if (typeof (window as any).showRewardedAd === 'function') {
      const res = await (window as any).showRewardedAd(type);
      if (res && res.success) {
        return;
      }
    }
    setCurrentAdStep(1);
    setIsPlayingAd(true);
  };

  const handleAdStepCompleted = () => {
    if (currentAdStep < selectedOption.adsCount) {
      const nextStep = currentAdStep + 1;
      setCurrentAdStep(nextStep);
      setSnackBarMessage(`Ad ${currentAdStep}/${selectedOption.adsCount} Done - Watch 1 More...`);
    } else {
      setIsPlayingAd(false);
      setCurrentAdStep(1);
      const fps = selectedOption.durationMinutes >= 120 ? '120' : selectedOption.durationMinutes >= 60 ? '90' : '60';
      startRewardBoost(selectedOption.durationMinutes, fps, selectedOption.label);
    }
  };

  const handleAdSkippedOrFailed = () => {
    setIsPlayingAd(false);
    setCurrentAdStep(1);
    sound.playClick();
    setSnackBarMessage('Ad Not Completed - Watch Again');
  };

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-20 pt-1 space-y-4">
      {/* Top Banner: Gift Box illustration with neon glow */}
      <div className="relative rounded-2xl overflow-hidden border border-pink-500/40 p-4 bg-gradient-to-r from-[#1f0621] via-[#15041a] to-[#070b1f] shadow-xl shadow-pink-950/40 flex items-center justify-between">
        <div className="max-w-[65%]">
          <div className="flex items-center space-x-1.5 text-pink-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Gift className="w-4 h-4 text-pink-400" />
            <span>Ad Rewards</span>
          </div>
          <h2 className="font-orbitron font-extrabold text-lg text-white leading-tight">
            Watch Ad Get 1 Hour Premium Boost
          </h2>
          <p className="text-[11px] text-pink-200/80 mt-1">
            Enjoy full 120 FPS Extreme &amp; VPN Firewall completely free.
          </p>
        </div>

        {/* 3D Gift Box Asset */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/30 border border-pink-400/50 flex items-center justify-center relative shadow-lg shadow-pink-500/30 overflow-hidden">
          <img 
            src="/assets/gift_box.png" 
            alt="Ad Gift Reward" 
            className="w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <Gift className="w-10 h-10 text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.9)]" />
        </div>
      </div>

      {/* Active Boost Status Card (if timer is running) */}
      {state.isBoosting && state.boostTimeRemainingSec > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-cyan-950/80 border border-emerald-400/60 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 font-mono font-bold block uppercase">
                ACTIVE BOOST TIMER
              </span>
              <span className="font-orbitron font-extrabold text-base text-white">
                {formatCountdown(state.boostTimeRemainingSec)} Left
              </span>
            </div>
          </div>

          <span className="text-[10px] bg-emerald-500 text-black font-bold px-2.5 py-1 rounded-full font-mono uppercase">
            120 FPS ON
          </span>
        </div>
      )}

      {/* Choose Ad Time Limit Section */}
      <div className="bg-[#071129]/90 border border-cyan-900/50 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-950">
          <h3 className="font-orbitron font-bold text-xs text-cyan-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Choose Ad Time Limit</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">Select Duration</span>
        </div>

        {/* Options List */}
        <div className="space-y-2">
          {adOptions.map((opt) => {
            const isSelected = selectedOption.id === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => {
                  sound.playClick();
                  setSelectedOption(opt);
                }}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,191,255,0.35)]'
                    : 'bg-[#050c1f] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <span className="font-orbitron font-bold text-xs text-slate-200">
                    {opt.label}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {opt.badge && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                      opt.badge === 'RECOMMENDED' 
                        ? 'bg-amber-400 text-black' 
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}>
                      {opt.badge}
                    </span>
                  )}

                  {/* Radio circle */}
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Button: Watch Ad Now */}
      <button
        onClick={handleStartAd}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-orbitron font-extrabold text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(99,102,241,0.6)] hover:shadow-[0_0_35px_rgba(99,102,241,0.8)] transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-98"
      >
        <Play className="w-4 h-4 fill-white" />
        <span>Watch Ad Now</span>
      </button>

      {/* Alternative Link: Upgrade to PRO */}
      <div className="text-center pt-1">
        <span className="text-[10px] text-slate-500 uppercase font-mono block mb-2">
          — OR —
        </span>
        <button
          onClick={() => {
            sound.playClick();
            setCurrentScreen('premium');
          }}
          className="text-xs text-amber-300 hover:text-amber-200 font-semibold flex items-center justify-center space-x-1.5 mx-auto group"
        >
          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="underline">Use PKG for Permanent Premium Access</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Rewarded Ad Interactive Modal */}
      {isPlayingAd && (
        <AdModal
          durationMinutes={selectedOption.durationMinutes}
          adStep={currentAdStep}
          totalAdSteps={selectedOption.adsCount}
          targetLabel={selectedOption.label}
          onAdCompleted={handleAdStepCompleted}
          onAdSkippedOrFailed={handleAdSkippedOrFailed}
        />
      )}
    </div>
  );
};
