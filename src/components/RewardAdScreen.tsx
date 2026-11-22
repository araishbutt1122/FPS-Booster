import React, { useState } from 'react';
import { 
  Play, 
  Clock, 
  Crown, 
  Check, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { AdRewardOption } from '../types.ts';
import { sound } from '../utils/audio.ts';

export const RewardAdScreen: React.FC = () => {
  const { 
    adOptions, 
    startRewardBoost, 
    cleanRam,
    state, 
    setCurrentScreen 
  } = useBooster();

  const [selectedOption, setSelectedOption] = useState<AdRewardOption>(
    adOptions.find(o => o.isRecommended) || adOptions[0]
  );

  const handleStartFreeBoost = () => {
    sound.playBoost();
    cleanRam();
    const fps = selectedOption.durationMinutes >= 120 ? '120' : selectedOption.durationMinutes >= 60 ? '90' : '60';
    startRewardBoost(selectedOption.durationMinutes, fps, selectedOption.label);
  };

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 pt-1 space-y-4">
      {/* Top Banner: Free Instant Boost */}
      <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 p-4 bg-gradient-to-r from-[#062118] via-[#041a13] to-[#070b1f] shadow-xl shadow-emerald-950/40 flex items-center justify-between">
        <div className="max-w-[68%]">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Free Boost Timers</span>
          </div>
          <h2 className="font-orbitron font-extrabold text-lg text-white leading-tight">
            Instant Free Boost - No Ads
          </h2>
          <p className="text-[11px] text-emerald-200/80 mt-1">
            Optimize for best FPS your device supports &amp; use VPN Firewall free with 1 click.
          </p>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/30 border border-emerald-400/50 flex items-center justify-center relative shadow-lg shadow-emerald-500/20">
          <Zap className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
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
            BOOST ON
          </span>
        </div>
      )}

      {/* Choose Free Boost Time Section */}
      <div className="bg-[#071129]/90 border border-cyan-900/50 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-950">
          <h3 className="font-orbitron font-bold text-xs text-cyan-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Choose Boost Duration</span>
          </h3>
          <span className="text-[10px] text-emerald-400 font-mono">100% Free</span>
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

      {/* Button: Start Boost Now */}
      <button
        onClick={handleStartFreeBoost}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-black font-orbitron font-extrabold text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:shadow-[0_0_35px_rgba(16,185,129,0.75)] transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-98"
      >
        <Play className="w-4 h-4 fill-black" />
        <span>Start Boost Now</span>
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
          className="text-xs text-amber-300 hover:text-amber-200 font-semibold flex items-center justify-center space-x-1.5 mx-auto group cursor-pointer"
        >
          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="underline">Use PKG for Permanent Premium Access</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
