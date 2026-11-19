import React, { useEffect, useState, useCallback } from 'react';
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

  const [bannerState, setBannerState] = useState<'loading' | 'loaded' | 'retry'>('loading');
  const [retryCount, setRetryCount] = useState(0);

  const handleRetryBanner = useCallback(() => {
    setBannerState('loading');
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const handles: Array<{ remove: () => Promise<void> }> = [];

    if (!shouldShowBanner) {
      if (isNative) {
        AdMob.hideBanner().catch(() => {});
      }
      setBannerState('loading');
      return;
    }

    if (!isNative) {
      return;
    }

    setBannerState('loading');

    // Don't stay stuck on "Ad Loading..." after 5 seconds
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setBannerState((prev) => (prev === 'loaded' ? 'loaded' : 'retry'));
      }
    }, 5000);

    async function setupNativeBanner() {
      try {
        const hLoaded = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
          clearTimeout(timeoutId);
          if (isMounted) setBannerState('loaded');
        });
        handles.push(hLoaded);

        const hFailed = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
          clearTimeout(timeoutId);
          if (isMounted) setBannerState('retry');
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
        clearTimeout(timeoutId);
        if (isMounted) setBannerState('retry');
      }
    }

    setupNativeBanner();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      handles.forEach((h) => {
        try {
          h.remove().catch(() => {});
        } catch {}
      });
      AdMob.hideBanner().catch(() => {});
    };
  }, [shouldShowBanner, isNative, retryCount]);

  // Show Banner ONLY on Home Screen and Premium Screen
  if (!shouldShowBanner) {
    return null;
  }

  // Native Android: reserve clean height above bottom nav bar; never get stuck on "Ad Loading..." after 5s
  if (isNative) {
    return (
      <div className="w-full px-3 py-1 z-20 shrink-0">
        {bannerState === 'loaded' ? (
          <div className="w-full h-[54px] shrink-0" />
        ) : bannerState === 'retry' ? (
          <button
            type="button"
            onClick={handleRetryBanner}
            className="w-full h-[54px] bg-[#061129] border border-cyan-800/70 rounded-xl px-3 flex items-center justify-center cursor-pointer active:scale-98"
          >
            <span className="text-[11px] font-mono text-amber-300 font-semibold">
              No Ad Found - Tap To Retry
            </span>
          </button>
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
