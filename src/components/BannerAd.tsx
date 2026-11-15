import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  BannerAdPluginEvents,
} from '@capacitor-community/admob';
import { useBooster, BANNER_AD_ID } from '../context/BoosterContext.tsx';

export const BannerAd: React.FC = () => {
  const { currentScreen } = useBooster();
  const isNative = Capacitor.isNativePlatform();
  const shouldShowBanner = currentScreen === 'home' || currentScreen === 'premium';

  const [nativeLoaded, setNativeLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const handles: Array<{ remove: () => Promise<void> }> = [];

    if (!shouldShowBanner) {
      if (isNative) {
        AdMob.hideBanner().catch(() => {});
      }
      setNativeLoaded(false);
      return;
    }

    if (!isNative) {
      return;
    }

    async function setupNativeBanner() {
      try {
        const hLoaded = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
          if (isMounted) setNativeLoaded(true);
        });
        handles.push(hLoaded);

        const hFailed = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
          if (isMounted) setNativeLoaded(false);
        });
        handles.push(hFailed);

        await AdMob.initialize({ initializeForTesting: false });
        await AdMob.showBanner({
          adId: BANNER_AD_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 74,
          isTesting: false,
        });
      } catch {
        if (isMounted) setNativeLoaded(false);
      }
    }

    setupNativeBanner();

    return () => {
      isMounted = false;
      handles.forEach((h) => {
        try {
          h.remove().catch(() => {});
        } catch {}
      });
      AdMob.hideBanner().catch(() => {});
    };
  }, [shouldShowBanner, isNative]);

  // Show Banner ONLY on Home Screen and Premium Screen
  if (!shouldShowBanner) {
    return null;
  }

  // Native Android: reserve clean height directly above bottom nav bar; show "Ad Loading..." until loaded (never blank black space)
  if (isNative) {
    return (
      <div className="w-full px-3 py-1 z-20 shrink-0">
        {nativeLoaded ? (
          <div className="w-full h-[54px] shrink-0" />
        ) : (
          <div className="w-full h-[54px] bg-[#061129] border border-cyan-900/60 rounded-xl px-3 flex items-center justify-center">
            <span className="text-[11px] font-mono text-cyan-300/80 animate-pulse">
              Ad Loading...
            </span>
          </div>
        )}
      </div>
    );
  }

  // Web Preview placeholder box directly above bottom navigation
  return (
    <div className="w-full px-3 py-1.5 z-20 shrink-0">
      <div className="w-full min-h-[50px] bg-[#040c21] border border-cyan-800/70 rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-md">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-mono font-bold text-[10px] uppercase shrink-0">
            Ad
          </span>
          <span className="text-[11px] text-cyan-200 font-mono font-semibold break-all">
            Banner Ad - {BANNER_AD_ID}
          </span>
        </div>
      </div>
    </div>
  );
};
