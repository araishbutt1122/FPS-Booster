import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Trophy, 
  CheckCircle2, 
  Gamepad2,
  Zap,
  Clock,
  Play
} from 'lucide-react';
import { sound } from '../utils/audio.ts';
import { REWARDED_AD_ID } from '../context/BoosterContext.tsx';

interface AdModalProps {
  durationMinutes: number;
  adStep: number;
  totalAdSteps: number;
  targetLabel: string;
  onAdCompleted: () => void;
  onAdSkippedOrFailed: () => void;
}

export const AdModal: React.FC<AdModalProps> = ({ 
  durationMinutes, 
  adStep, 
  totalAdSteps, 
  targetLabel,
  onAdCompleted, 
  onAdSkippedOrFailed 
}) => {
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [isRewarded, setIsRewarded] = useState(false);

  useEffect(() => {
    sound.playBoost();
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanSkip(true);
          setIsRewarded(true);
          sound.playReward();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleClosePrematurely = () => {
    sound.playClick();
    onAdSkippedOrFailed();
  };

  const handleClaim = () => {
    sound.playSuccess();
    onAdCompleted();
  };

  const isFinalStep = adStep >= totalAdSteps;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-[#030717] border-2 border-cyan-500/70 shadow-2xl shadow-cyan-500/40 overflow-hidden relative flex flex-col justify-between min-h-[460px]">
        {/* Top Ad Header Bar */}
        <div className="px-4 py-2.5 bg-black/70 flex items-center justify-between border-b border-cyan-950 z-20">
          <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-mono">
            <span className="bg-amber-400 text-black font-bold px-1.5 py-0.2 rounded text-[10px]">
              AD
            </span>
            <span className="truncate max-w-[190px] text-[10px] text-cyan-300 font-mono font-bold">
              {REWARDED_AD_ID}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {!canSkip ? (
              <span className="text-xs font-mono text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800 animate-pulse font-bold">
                Reward in {countdown}s
              </span>
            ) : (
              <button
                onClick={handleClaim}
                className="p-1 rounded-full bg-cyan-500 text-black hover:bg-cyan-400 cursor-pointer"
                title="Claim Reward"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Video / Interactive Ad Content */}
        <div className="flex-1 p-5 flex flex-col items-center justify-center text-center relative z-10 space-y-3.5">
          {/* Ad Progress Badge (e.g. Ad 1 of 2) */}
          <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-400 text-cyan-300 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ad {adStep}/{totalAdSteps} • {targetLabel}</span>
          </div>

          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 via-purple-600 to-pink-500 p-1 shadow-2xl shadow-cyan-500/50 animate-pulse">
              <div className="w-full h-full rounded-3xl bg-[#060c24] flex items-center justify-center">
                <Gamepad2 className="w-12 h-12 text-cyan-400 animate-bounce" />
              </div>
            </div>
            <Sparkles className="w-6 h-6 text-amber-300 absolute -top-2 -right-2 animate-ping" />
          </div>

          <div>
            <h3 className="font-orbitron font-black text-xl text-white tracking-wide">
              CYBER WARFARE 120
            </h3>
            <p className="text-xs text-cyan-300 font-medium mt-0.5">
              Real AdMob Engine • Zero Latency Boost
            </p>
          </div>

          {/* Reward Status */}
          {isRewarded ? (
            <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-xs font-bold animate-bounce flex items-center justify-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {isFinalStep
                  ? `Completed! +${durationMinutes} Min Boost Activated!`
                  : `Ad ${adStep}/${totalAdSteps} Done - Watch 1 More...`}
              </span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-900/60 max-w-xs text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-center space-x-1 text-cyan-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rewarded Verification</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Watch full ad without skipping to start instant high-FPS boost timer.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 bg-[#050e26] border-t border-cyan-950 z-20 space-y-2">
          {canSkip ? (
            <button
              onClick={handleClaim}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-orbitron font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/40 hover:opacity-90 flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <span>
                {isFinalStep ? `START +${durationMinutes} MIN BOOST NOW` : `NEXT AD (${adStep + 1}/${totalAdSteps})`}
              </span>
              <Zap className="w-4 h-4 fill-black" />
            </button>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
              <span>Watching Ad {adStep} of {totalAdSteps}...</span>
              <button
                onClick={handleClosePrematurely}
                className="text-red-400 hover:text-red-300 underline text-[11px] cursor-pointer"
              >
                Cancel / Skip
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
