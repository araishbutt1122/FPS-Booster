// ----------------------------------------------------
// FPS BOOSTER PRO 120 - STANDALONE APP.JS
// AdMob 3 Real Ads & Hardware Stats
// ----------------------------------------------------

const ADMOB_CONFIG = {
  BANNER_ID: 'ca-app-pub-8318388001860392/2099191820',
  REWARDED_ID: 'ca-app-pub-8318388001860392/6700927605',
  APP_OPEN_ID: 'ca-app-pub-8318388001860392/8289341446',
};

let isAdMobInitialized = false;

async function getAdMobPlugin() {
  const cap = window.Capacitor;
  if (cap && cap.Plugins && cap.Plugins.AdMob) {
    return cap.Plugins.AdMob;
  }
  return null;
}

// 1. Initialize AdMob, App Open Ad and Banner Ad
async function initAds() {
  try {
    const AdMob = await getAdMobPlugin();
    if (AdMob && !isAdMobInitialized) {
      await AdMob.initialize({ initializeForTesting: false });
      isAdMobInitialized = true;
    }
    await showAppOpen();
    await showBanner();
  } catch(e) {
    console.log('initAds notice:', e);
  }
}

// 2. Bottom Center Banner Ad
async function showBanner() {
  try {
    const AdMob = await getAdMobPlugin();
    if (AdMob) {
      if (!isAdMobInitialized) {
        await AdMob.initialize({ initializeForTesting: false });
        isAdMobInitialized = true;
      }
      await AdMob.showBanner({
        adId: ADMOB_CONFIG.BANNER_ID,
        adSize: 'BANNER',
        position: 'BOTTOM_CENTER',
        margin: 0,
        isTesting: false
      });
    }
  } catch(e) {
    console.log('showBanner notice:', e);
  }
}

// 3. App Open Ad
async function showAppOpen() {
  try {
    const AdMob = await getAdMobPlugin();
    if (AdMob && typeof AdMob.prepareAppOpen === 'function') {
      await AdMob.prepareAppOpen({
        adId: ADMOB_CONFIG.APP_OPEN_ID,
        isTesting: false
      });
      await AdMob.showAppOpen();
    }
  } catch(e) {
    console.log('showAppOpen notice:', e);
  }
}

// 4. Rewarded Ads for 4 Buttons
async function showRewardedAd(type) {
  let adsCount = 1;
  let boostMinutes = 10;
  let title = '10 Min Boost';

  if (type === '10m' || type === 10) {
    adsCount = 1; boostMinutes = 10; title = '10 Min Boost';
  } else if (type === '30m' || type === 30) {
    adsCount = 1; boostMinutes = 30; title = '30 Min Boost';
  } else if (type === '60m' || type === 60) {
    adsCount = 2; boostMinutes = 60; title = '60 Min Turbo Boost';
  } else if (type === '120m' || type === 120) {
    adsCount = 3; boostMinutes = 120; title = '120 Min VIP Unlock';
  }

  try {
    const AdMob = await getAdMobPlugin();
    for (let i = 1; i <= adsCount; i++) {
      if (AdMob) {
        await AdMob.prepareRewardVideoAd({
          adId: ADMOB_CONFIG.REWARDED_ID,
          isTesting: false
        });
        await AdMob.showRewardVideoAd();
      }
    }

    // Dispatch reward event to UI
    window.dispatchEvent(new CustomEvent('fpsbooster_reward_granted', {
      detail: {
        durationMinutes: boostMinutes,
        label: title,
        targetFps: boostMinutes >= 120 ? '120' : (boostMinutes >= 60 ? '90' : '60')
      }
    }));
    return { success: true, boostMinutes, title };
  } catch(e) {
    console.log('Rewarded Ad error:', e);
    return { success: false, error: e };
  }
}

// Expose to window
window.initAds = initAds;
window.showBanner = showBanner;
window.showAppOpen = showAppOpen;
window.showRewardedAd = showRewardedAd;

// Auto init on load
if (document.readyState === 'complete') {
  initAds();
} else {
  window.addEventListener('load', initAds);
}
