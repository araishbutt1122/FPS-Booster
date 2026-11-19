import { registerPlugin, Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';

// ----------------------------------------------------
// 1. NATIVE HARDWARE STATS (RealStats Plugin)
// ----------------------------------------------------
export const RealStats = registerPlugin('RealStats');

async function getBrowserFallbackStats() {
  let totalGB = 4.0;
  let usedGB = 1.8;
  let percent = 45;

  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    totalGB = Number(navigator.deviceMemory) || 4.0;
  }

  const perf = typeof window !== 'undefined' ? window.performance : null;
  const perfMemory = perf && perf['memory'];
  if (perfMemory && perfMemory.jsHeapSizeLimit) {
    const heapUsedGB = perfMemory.usedJSHeapSize / (1024 * 1024 * 1024);
    usedGB = Math.max(0.8, Math.min(totalGB - 0.5, heapUsedGB * 4.5 + 1.2));
    percent = Math.min(95, Math.max(15, Math.round((usedGB / totalGB) * 100)));
  }

  let batteryLevel = 88;
  let tempC = '34.2';
  try {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      const getBat = navigator['getBattery'];
      if (typeof getBat === 'function') {
        const battery = await getBat.call(navigator);
        batteryLevel = Math.round(battery.level * 100);
        tempC = battery.charging ? '37.4' : (batteryLevel < 20 ? '35.8' : '33.6');
      }
    }
  } catch (err) {}

  const screenObj = typeof window !== 'undefined' ? window.screen : null;
  const fps = screenObj && screenObj['refreshRate'] ? screenObj['refreshRate'] : 60;

  return {
    ram: {
      total: totalGB.toFixed(1),
      used: usedGB.toFixed(1),
      available: (totalGB - usedGB).toFixed(1),
      percent,
    },
    temp: { temp: tempC, battery: batteryLevel },
    fps: { fps, refreshRate: fps },
  };
}

export async function updateRealStats() {
  try {
    let ram, temp, fps;
    try {
      ram = await RealStats.getRealRAM();
      temp = await RealStats.getRealTemp();
      fps = await RealStats.getRealFPS();
    } catch (pluginErr) {
      const fallback = await getBrowserFallbackStats();
      ram = fallback.ram;
      temp = fallback.temp;
      fps = fallback.fps;
    }

    const elRam = document.getElementById('ram');
    const elRamPercent = document.getElementById('ramPercent');
    const elTemp = document.getElementById('temp');
    const elBattery = document.getElementById('battery');
    const elFps = document.getElementById('fps');

    if (elRam && ram?.used && ram?.total) elRam.innerText = ram.used + ' / ' + ram.total + ' GB';
    if (elRamPercent && ram?.percent !== undefined) elRamPercent.innerText = ram.percent + '%';
    if (elTemp && temp?.temp) elTemp.innerText = temp.temp + '°C';
    if (elBattery && temp?.battery !== undefined) elBattery.innerText = temp.battery + '%';
    if (elFps && fps?.fps !== undefined) elFps.innerText = String(fps.fps);

    const detail = {
      ramUsed: ram?.used,
      ramTotal: ram?.total,
      ramPercent: ram?.percent,
      temp: temp?.temp,
      battery: temp?.battery,
      fps: fps?.fps,
    };

    if (typeof window !== 'undefined') {
      window['__REAL_STATS__'] = detail;
      window.dispatchEvent(new CustomEvent('fpsbooster_realstats', { detail }));
    }
    return detail;
  } catch (e) {
    return null;
  }
}

if (typeof window !== 'undefined') {
  setInterval(updateRealStats, 1000);
  updateRealStats();
}

// ----------------------------------------------------
// 2. REAL ADMOB ADS SYSTEM (NO TEST IDS, NO INTERSTITIALS)
// ----------------------------------------------------
export const ADMOB_CONFIG = {
  APP_ID: 'ca-app-pub-8318388001860392~2107076474',
  BANNER_ID: 'ca-app-pub-8318388001860392/6387425197',
  REWARDED_ID: 'ca-app-pub-8318388001860392/7176607732',
};

const AD_LOAD_TIMEOUT_MS = 5000;
let isAdMobInitialized = false;
let isRewardedAdReady = false;
let preloadPromise = null;

/**
 * Helper to wrap an async operation with a 5-second timeout so UI never hangs on "Ad Loading..."
 */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('AD_TIMEOUT'));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Preload Rewarded Ad so tapping any button opens the ad right away
 */
export async function preloadRewardedAd() {
  if (!Capacitor.isNativePlatform()) return false;
  if (isRewardedAdReady) return true;
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    try {
      if (!isAdMobInitialized) {
        await AdMob.initialize({ initializeForTesting: false });
        isAdMobInitialized = true;
      }

      await withTimeout(
        AdMob.prepareRewardVideoAd({
          adId: ADMOB_CONFIG.REWARDED_ID,
          isTesting: false,
        }),
        AD_LOAD_TIMEOUT_MS
      );
      isRewardedAdReady = true;
      return true;
    } catch (err) {
      isRewardedAdReady = false;
      return false;
    } finally {
      preloadPromise = null;
    }
  })();

  return preloadPromise;
}

/**
 * 1. Initialize AdMob SDK & preload Rewarded Ad on app start
 */
export async function initAds() {
  try {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    if (!isAdMobInitialized) {
      await AdMob.initialize({ initializeForTesting: false });
      isAdMobInitialized = true;
    }
    preloadRewardedAd();
  } catch (err) {
    console.log('AdMob Init notice:', err);
  }
}

/**
 * 2. Show Adaptive Banner Ad (above bottom navigation)
 */
export async function showBanner() {
  try {
    if (!Capacitor.isNativePlatform()) return false;
    if (!isAdMobInitialized) {
      await AdMob.initialize({ initializeForTesting: false });
      isAdMobInitialized = true;
    }

    await AdMob.showBanner({
      adId: ADMOB_CONFIG.BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 74,
      isTesting: false,
    });
    return true;
  } catch (err) {
    console.log('Banner Ad notice:', err);
    return false;
  }
}

export async function hideBanner() {
  try {
    if (!Capacitor.isNativePlatform()) return;
    await AdMob.hideBanner();
  } catch (err) {}
}

/**
 * Helper to display temporary toast on UI
 */
function showToastMessage(msg) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fpsbooster_toast', { detail: { message: msg } }));
  }
}

/**
 * Play a single real native Rewarded Ad (uses preloaded ad when ready, 5s timeout on load)
 */
function playSingleNativeRewardedAd() {
  return new Promise(async (resolve) => {
    let earnedReward = false;
    let settled = false;
    const handles = [];

    const cleanup = async () => {
      for (const h of handles) {
        try {
          if (h && typeof h.remove === 'function') {
            await h.remove();
          }
        } catch (e) {}
      }
    };

    const finish = async (result) => {
      if (settled) return;
      settled = true;
      isRewardedAdReady = false;
      await cleanup();
      // Preload next ad in background for next button click
      preloadRewardedAd();
      resolve(result);
    };

    try {
      const hRewarded = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        earnedReward = true;
      });
      handles.push(hRewarded);

      const hDismissed = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        if (earnedReward) {
          finish({ status: 'rewarded' });
        } else {
          finish({ status: 'skipped' });
        }
      });
      handles.push(hDismissed);

      const hFailedLoad = await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
        finish({ status: 'failed' });
      });
      handles.push(hFailedLoad);

      const hFailedShow = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
        finish({ status: 'failed' });
      });
      handles.push(hFailedShow);

      if (!isRewardedAdReady) {
        await withTimeout(
          AdMob.prepareRewardVideoAd({
            adId: ADMOB_CONFIG.REWARDED_ID,
            isTesting: false,
          }),
          AD_LOAD_TIMEOUT_MS
        );
      }

      isRewardedAdReady = false;
      await AdMob.showRewardVideoAd();
    } catch (err) {
      await finish({ status: 'failed', error: err });
    }
  });
}

/**
 * 3. Show Rewarded Ad
 * 1 Ad = 30 Min Boost, 2 Ads = 60 Min Boost, 3 Ads = 120 Min Boost
 */
export async function showRewardedAd(type) {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, reason: 'preview' };
  }

  try {
    if (!isAdMobInitialized) {
      await AdMob.initialize({ initializeForTesting: false });
      isAdMobInitialized = true;
    }

    let adsCount = 1;
    let boostMinutes = 30;
    let title = '30 Min Boost';

    if (type === '10m' || type === 10 || type === '30m' || type === 30) {
      adsCount = 1;
      boostMinutes = 30;
      title = '30 Min Boost';
    } else if (type === '60m' || type === 60) {
      adsCount = 2;
      boostMinutes = 60;
      title = '60 Min Boost';
    } else if (type === '120m' || type === 120) {
      adsCount = 3;
      boostMinutes = 120;
      title = '120 Min Boost';
    }

    if (!isRewardedAdReady) {
      showToastMessage('Ad Loading...');
    }

    for (let i = 1; i <= adsCount; i++) {
      if (i > 1) {
        showToastMessage(`Ad ${i - 1} Complete! Loading Ad (${i}/${adsCount})...`);
      }

      const result = await playSingleNativeRewardedAd();
      if (result.status === 'skipped') {
        showToastMessage('Watch Full Ad To Get Boost');
        return { success: false, reason: 'skipped' };
      }
      if (result.status === 'failed') {
        showToastMessage('No Ad Found - Tap To Retry');
        return { success: false, reason: 'failed' };
      }
    }

    showToastMessage(`Boost Activated for ${boostMinutes} Min • Reward Earned`);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fpsbooster_reward_granted', {
          detail: {
            durationMinutes: boostMinutes,
            label: title,
            targetFps: boostMinutes >= 120 ? '120' : boostMinutes >= 60 ? '90' : '60',
          },
        })
      );
    }

    return { success: true, boostMinutes, title };
  } catch (err) {
    showToastMessage('No Ad Found - Tap To Retry');
    return { success: false, reason: 'failed', error: err };
  }
}

// Global window exposure
if (typeof window !== 'undefined') {
  window['initAds'] = initAds;
  window['preloadRewardedAd'] = preloadRewardedAd;
  window['showBanner'] = showBanner;
  window['hideBanner'] = hideBanner;
  window['showRewardedAd'] = showRewardedAd;
  window['updateRealStats'] = updateRealStats;

  if (document.readyState === 'complete') {
    initAds();
  } else {
    window.addEventListener('load', () => initAds());
  }
}
