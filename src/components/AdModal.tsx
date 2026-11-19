import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  Trophy,
  CheckCircle2,
  Gamepad2,
  Zap,
  Clock,
  RotateCcw,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { sound } from '../utils/audio.ts';
import { REWARDED_AD_ID } from '../context/BoosterContext.tsx';

interface AdModalProps {
  durationMinutes: number;
  adStep: number;
  totalAdSteps: number;
  targetLabel: string;
  initialError?: boolean;
  onAdCompleted: () => void;
  onAdSkippedOrFailed: () => void;
  onRetryNative?: () => Promise<boolean>;
}

type ModalPhase = 'loading' | 'watching' | 'error';

export const AdModal: React.FC<AdModalProps> = ({
  durationMinutes,
  adStep,
  totalAdSteps,
  targetLabel,
  initialError = false,
  onAdCompleted,
  onAdSkippedOrFailed,
  onRetryNative,
}) => {
  const [phase, setPhase] = useState<ModalPhase>(initialError ? 'error' : 'loading');
  const [countdown, setCountdown] = useState(5);
  const [isRewarded, setIsRewarded] = useState(false);

  const startAdLoadSequence = useCallback(() => {
    setPhase('loading');
    setCountdown(5);
    setIsRewarded(false);

    const loadTimer = setTimeout(() => {
      setPhase('watching');
      sound.playBoost();
    }, 1200);

    return () => clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (initialError) {
      setPhase('error');
      return;
    }
    const cleanup = startAdLoadSequence();
    return cleanup;
  }, [adStep, initialError, startAdLoadSequence]);

  // 5-second max wait guard if phase stays stuck in 'loading'
  useEffect(() => {
    if (phase !== 'loading') return;
    const safetyTimer = setTimeout(() => {
      setPhase('error');
    }, 5000);
    return () => clearTimeout(safetyTimer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'watching') return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRewarded(true);
          sound.playReward();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  const handleClosePrematurely = () => {
    sound.playClick();
    onAdSkippedOrFailed();
  };

  const handleClaim = () => {
    sound.playSuccess();
    onAdCompleted();
  };

  const handleRetry = async () => {
    sound.playClick();
    if (onRetryNative) {
      setPhase('loading');
      const retryTimeout = setTimeout(() => {
        setPhase('error');
      }, 5000);

      try {
        const ok = await onRetryNative();
        clearTimeout(retryTimeout);
        if (!ok) {
          setPhase('error');
        }
      } catch {
        clearTimeout(retryTimeout);
        setPhase('error');
      }
      return;
    }
    startAdLoadSequence();
  };

  const isFinalStep = adStep >= totalAdSteps;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-[#030717] border-2 border-cyan-500/70 shadow-2xl shadow-cyan-500/40 overflow-hidden relative flex flex-col justify-between min-h-[440px]">
        {/* Top Ad Header Bar */}
        <div className="px-4 py-2.5 bg-black/70 flex items-center justify-between border-b border-cyan-950 z-20 gap-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-mono min-w-0">
            <span className="bg-amber-400 text-black font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0">
              AD
            </span>
            <span className="text-[10px] text-cyan-300 font-mono font-bold break-all">
              {REWARDED_AD_ID}
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {phase === 'watching' && !isRewarded && (
              <span className="text-xs font-mono text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800 animate-pulse font-bold whitespace-nowrap">
                {countdown}s
              </span>
            )}
            {(isRewarded || phase === 'error') && (
              <button
                onClick={isRewarded ? handleClaim : handleClosePrematurely}
                className="p-1 rounded-full bg-cyan-500 text-black hover:bg-cyan-400 cursor-pointer"
                title={isRewarded ? 'Claim Reward' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Center Content by Phase */}
        {phase === 'loading' && (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-cyan-950/80 border-2 border-cyan-400/70 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-cyan-300 animate-spin" />
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-base text-white">
                Ad Loading...
              </h3>
              <p className="text-xs text-cyan-300/80 font-mono mt-1">
                Connecting to Google AdMob Rewarded Server
              </p>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div
            onClick={handleRetry}
            className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-400/70 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-base text-white">
                No Ad Found - Tap To Retry
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ad is still loading or temporarily unavailable. Tap below to retry.
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRetry();
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-400 text-black font-orbitron font-extrabold text-xs uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer hover:brightness-110"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Tap To Retry</span>
            </button>
          </div>
        )}

        {phase === 'watching' && (
          <div className="flex-1 p-5 flex flex-col items-center justify-center text-center relative z-10 space-y-3.5">
            <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-400 text-cyan-300 text-xs font-mono font-bold">
              <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                Ad {adStep}/{totalAdSteps} • {targetLabel}
              </span>
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
              <h3 className="font-orbitron font-black text-lg text-white tracking-wide">
                Rewarded Video Ad
              </h3>
              <p className="text-xs text-cyan-300 font-medium mt-0.5">
                FPS Booster Pro 120 • Free Boost Session
              </p>
            </div>

            {isRewarded ? (
              <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-xs font-bold flex items-center justify-center space-x-2">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {isFinalStep
                    ? `Reward Earned! Boost Activated for ${durationMinutes} Min`
                    : `Ad ${adStep}/${totalAdSteps} Done - Continue to Next Ad`}
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-900/60 max-w-xs text-xs text-slate-300 space-y-1">
                <div className="flex items-center justify-center space-x-1 text-cyan-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Rewarded Verification</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Watch full ad to get boost ({durationMinutes} Min). Closing early will not grant reward.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="p-4 bg-[#050e26] border-t border-cyan-950 z-20 space-y-2">
          {phase === 'watching' && isRewarded ? (
            <button
              onClick={handleClaim}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-orbitron font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/40 hover:opacity-90 flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <span>
                {isFinalStep
                  ? `ACTIVATE ${durationMinutes} MIN BOOST`
                  : `NEXT AD (${adStep + 1}/${totalAdSteps})`}
              </span>
              <Zap className="w-4 h-4 fill-black" />
            </button>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
              <span>
                {phase === 'loading'
                  ? 'Ad Loading...'
                  : phase === 'error'
                  ? 'No Ad Found'
                  : `Watching Ad ${adStep} of ${totalAdSteps}...`}
              </span>
              <button
                onClick={handleClosePrematurely}
                className="text-red-400 hover:text-red-300 underline text-[11px] cursor-pointer"
              >
                {phase === 'error' ? 'Close' : 'Cancel / Skip'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
