import React, { useEffect, useState } from 'react';
import { useBooster, BANNER_AD_ID } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';

export const BannerAd: React.FC = () => {
  const { state } = useBooster();
  const [nativeBannerShown, setNativeBannerShown] = useState(false);

  // If user is VIP / PRO with No-Ads perk, don't show ad
  if (state.isPro && (state.proTier === 'vip' || state.proTier === '90day')) {
    return null;
  }

  useEffect(() => {
    let isMounted = true;

    async function initNativeBanner() {
      try {
        // Initialize and show real AdMob banner if Capacitor AdMob is available
        await AdMob.initialize({ initializeForTesting: false });
        await AdMob.showBanner({
          adId: BANNER_AD_ID,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: false,
        });
        if (isMounted) setNativeBannerShown(true);
      } catch (e) {
        // Not running in native container or web preview
        if (isMounted) setNativeBannerShown(false);
      }
    }

    initNativeBanner();

    return () => {
      isMounted = false;
      try {
        AdMob.hideBanner().catch(() => {});
      } catch (e) {}
    };
  }, []);

  // If native banner is active in Android WebView overlay, avoid duplicate box
  if (nativeBannerShown) {
    return <div className="w-full h-[50px] shrink-0" />;
  }

  // Real Google AdMob Live Banner container (Clean official banner layout, NO dummy CyberStrike)
  return (
    <div className="w-full px-3 py-1 z-20 shrink-0">
      <div 
        className="w-full h-[50px] bg-[#030919] border border-cyan-800/60 rounded-xl px-3 flex items-center justify-between shadow-lg relative overflow-hidden"
      >
        <div className="flex items-center space-x-2.5 z-10">
          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-mono font-bold text-[9px] uppercase tracking-wider shrink-0 shadow-sm">
            Ad
          </span>
          <div className="leading-tight">
            <h5 className="font-orbitron font-bold text-[11px] text-white flex items-center space-x-1">
              <span>Google AdMob • Real Banner (320x50)</span>
            </h5>
            <p className="text-[9px] text-cyan-400/90 font-mono truncate max-w-[220px]">
              {BANNER_AD_ID}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 z-10">
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold uppercase">
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
};
