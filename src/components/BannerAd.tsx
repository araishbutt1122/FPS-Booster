import React, { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useBooster, BANNER_AD_ID } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';

export const BannerAd: React.FC = () => {
  const { state, setSnackBarMessage } = useBooster();
  const [isAdLoaded, setIsAdLoaded] = useState(true);

  // If user is VIP / PRO with No-Ads perk, don't show ad
  if (state.isPro && (state.proTier === 'vip' || state.proTier === '90day')) {
    return null;
  }

  const handleBannerClick = () => {
    sound.playClick();
    if (!isAdLoaded) {
      setSnackBarMessage('Ad Loading... Try Again');
      setTimeout(() => setIsAdLoaded(true), 1500);
      return;
    }
    setSnackBarMessage('Opening Sponsor: CyberStrike 120 FPS...');
  };

  return (
    <div className="w-full px-3 py-1 z-20 shrink-0">
      <div 
        onClick={handleBannerClick}
        className="w-full h-[52px] bg-gradient-to-r from-[#09152e] via-[#050f24] to-[#09152e] border border-cyan-500/40 rounded-xl p-2 flex items-center justify-between shadow-lg shadow-black/80 relative overflow-hidden cursor-pointer hover:border-cyan-400 transition-all"
      >
        {/* Subtle cyan scanner line */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-[shimmer_3s_infinite] pointer-events-none" />

        <div className="flex items-center space-x-2.5 z-10">
          <div className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-mono font-bold text-[9px] uppercase tracking-wider shrink-0 shadow-sm">
            Ad
          </div>
          <div className="leading-tight">
            <h5 className="font-orbitron font-bold text-[11px] text-white flex items-center space-x-1">
              <span>CyberStrike Mobile 120 FPS</span>
              <Sparkles className="w-3 h-3 text-cyan-400" />
            </h5>
            <p className="text-[9px] text-cyan-300 font-mono">
              AdMob • {BANNER_AD_ID}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleBannerClick();
            }}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-orbitron font-bold text-[10px] uppercase hover:opacity-90 transition-opacity shadow-sm"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};
