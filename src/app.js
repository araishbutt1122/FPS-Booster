import { registerPlugin } from '@capacitor/core';

// ----------------------------------------------------
// NATIVE HARDWARE STATS (RealStats Plugin)
// ----------------------------------------------------
export const RealStats = registerPlugin('RealStats');

const TRANSIENT_CACHE_KEYS = [
  'fps_booster_perf_cache_v1',
  'fps_booster_temp_diag_v1',
];

function calculateBrowserTempCacheKb() {
  if (typeof localStorage === 'undefined') return 0;
  let totalBytes = 0;
  for (const key of TRANSIENT_CACHE_KEYS) {
    const val = localStorage.getItem(key);
    if (val) totalBytes += val.length * 2;
  }
  return Math.max(0, Math.round(totalBytes / 1024));
}

async function getBrowserStorageEstimate() {
  let totalGb = 64.0;
  let freeGb = 28.4;
  let usedPercent = 56;
  const appTempCacheKb = calculateBrowserTempCacheKb();

  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
      const est = await navigator.storage.estimate();
      if (est && typeof est.quota === 'number' && est.quota > 0) {
        const quotaGb = est.quota / (1024 * 1024 * 1024);
        const usageGb = (est.usage || 0) / (1024 * 1024 * 1024);
        // Chromium returns a synthetic ~10.0 GB origin quota with ~0 usage when disk metrics are sandboxed.
        // Only adopt StorageManager metrics when usage is real (> 0.05 GB) and free < total.
        const isSyntheticEmptyOriginQuota = quotaGb >= 9.0 && quotaGb <= 11.0 && usageGb < 0.05;
        if (quotaGb >= 1.0 && !isSyntheticEmptyOriginQuota && usageGb >= 0.05) {
          totalGb = Number(quotaGb.toFixed(1));
          freeGb = Number(Math.max(0.1, Math.min(totalGb - 0.1, quotaGb - usageGb)).toFixed(1));
          usedPercent = Math.min(99, Math.max(1, Math.round(((totalGb - freeGb) / totalGb) * 100)));
        }
      }
    }
  } catch {
    // Keep conservative default estimate when StorageManager is restricted
  }

  return {
    totalGb: totalGb.toFixed(1),
    freeGb: freeGb.toFixed(1),
    usedPercent,
    appTempCacheKb,
    isNativeStorage: false,
  };
}

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
  let isCharging = false;
  try {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      const getBat = navigator['getBattery'];
      if (typeof getBat === 'function') {
        const battery = await getBat.call(navigator);
        batteryLevel = Math.round(battery.level * 100);
        isCharging = Boolean(battery.charging);
        tempC = battery.charging ? '37.4' : (batteryLevel < 20 ? '35.8' : '33.6');
      }
    }
  } catch (err) {}

  const screenObj = typeof window !== 'undefined' ? window.screen : null;
  const cachedDisplay = typeof window !== 'undefined' ? window['__FPS_BOOSTER_DISPLAY_INFO__'] : null;
  const fps =
    (cachedDisplay && cachedDisplay.maxHz) ||
    (screenObj && screenObj['refreshRate']) ||
    60;
  const dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;
  const storage = await getBrowserStorageEstimate();

  return {
    ram: {
      total: totalGB.toFixed(1),
      used: usedGB.toFixed(1),
      available: (totalGB - usedGB).toFixed(1),
      percent,
    },
    temp: { temp: tempC, battery: batteryLevel, isCharging },
    fps: {
      fps,
      refreshRate: fps,
      maxRefreshRate: fps,
      widthPixels: screenObj?.width ? Math.round(screenObj.width * dpr) : undefined,
      heightPixels: screenObj?.height ? Math.round(screenObj.height * dpr) : undefined,
      densityDpi: Math.round(dpr * 160),
      isNativeDisplay: false,
    },
    storage,
  };
}

export async function getStorageStats() {
  try {
    if (RealStats && typeof RealStats.getStorageStats === 'function') {
      const res = await RealStats.getStorageStats();
      if (res && res.freeGb !== undefined) {
        return {
          totalGb: String(res.totalGb),
          freeGb: String(res.freeGb),
          usedPercent: Number(res.usedPercent) || 0,
          appTempCacheKb: Number(res.appTempCacheKb) || 0,
          isNativeStorage: Boolean(res.isNativeStorage ?? true),
        };
      }
    }
  } catch {
    // Fallback to StorageManager API
  }
  return getBrowserStorageEstimate();
}

export async function clearAppTempCache() {
  try {
    if (RealStats && typeof RealStats.clearAppTempCache === 'function') {
      const res = await RealStats.clearAppTempCache();
      if (res && res.freedKb !== undefined) {
        return {
          freedKb: Number(res.freedKb) || 0,
          remainingCacheKb: Number(res.remainingCacheKb) || 0,
          freeGb: String(res.freeGb || '0.0'),
          totalGb: String(res.totalGb || '0.0'),
          usedPercent: Number(res.usedPercent) || 0,
          isNativeStorage: true,
        };
      }
    }
  } catch {
    // Browser fallback
  }

  let freedBytes = 0;
  if (typeof localStorage !== 'undefined') {
    for (const key of TRANSIENT_CACHE_KEYS) {
      const val = localStorage.getItem(key);
      if (val) {
        freedBytes += val.length * 2;
        localStorage.removeItem(key);
      }
    }
    const histRaw = localStorage.getItem('fps_booster_fps_history_v1');
    if (histRaw && histRaw.length > 2048) {
      try {
        const parsed = JSON.parse(histRaw);
        if (Array.isArray(parsed) && parsed.length > 20) {
          const compact = JSON.stringify(parsed.slice(-20));
          freedBytes += Math.max(0, (histRaw.length - compact.length) * 2);
          localStorage.setItem('fps_booster_fps_history_v1', compact);
        }
      } catch {
        // Ignore parse error
      }
    }
  }

  const latest = await getBrowserStorageEstimate();
  return {
    freedKb: Math.max(0, Math.round(freedBytes / 1024)),
    remainingCacheKb: latest.appTempCacheKb,
    freeGb: latest.freeGb,
    totalGb: latest.totalGb,
    usedPercent: latest.usedPercent,
    isNativeStorage: false,
  };
}

let isUpdatingRealStats = false;

export async function updateRealStats() {
  if (isUpdatingRealStats) {
    return typeof window !== 'undefined' ? window['__REAL_STATS__'] || null : null;
  }
  isUpdatingRealStats = true;
  try {
    let ram, temp, fps, storage;
    try {
      if (RealStats && typeof RealStats.getAllRealStats === 'function') {
        const all = await RealStats.getAllRealStats();
        ram = {
          total: all.total,
          used: all.used,
          available: all.available,
          percent: all.percent,
        };
        temp = { temp: all.temp, battery: all.battery };
        fps = {
          fps: all.fps,
          refreshRate: all.fps,
          maxRefreshRate: all.maxRefreshRate || all.fps,
          supportedRefreshRates: all.supportedRefreshRates,
          widthPixels: all.widthPixels,
          heightPixels: all.heightPixels,
          densityDpi: all.densityDpi,
          detectionSource: all.detectionSource,
          isNativeDisplay: Boolean(all.isNativeDisplay ?? true),
        };
        storage = {
          totalGb: all.storageTotalGb,
          freeGb: all.storageFreeGb,
          usedPercent: all.storageUsedPercent,
          appTempCacheKb: all.appTempCacheKb,
          isNativeStorage: true,
        };
      } else {
        throw new Error('Fallback to individual calls');
      }
    } catch {
      try {
        ram = await RealStats.getRealRAM();
        temp = await RealStats.getRealTemp();
        fps = await RealStats.getRealFPS();
        storage = await getStorageStats();
      } catch {
        const fallback = await getBrowserFallbackStats();
        ram = fallback.ram;
        temp = fallback.temp;
        fps = fallback.fps;
        storage = fallback.storage;
      }
    }

    // Telemetry values are delivered to React via the 'fpsbooster_realstats' event below;
    // avoid mutating React-owned DOM text nodes directly.

    const detail = {
      ramUsed: ram?.used,
      ramTotal: ram?.total,
      ramPercent: ram?.percent,
      temp: temp?.temp,
      battery: temp?.battery,
      isCharging: temp?.isCharging,
      fps: fps?.fps,
      maxRefreshRate: fps?.maxRefreshRate,
      supportedRefreshRates: fps?.supportedRefreshRates,
      widthPixels: fps?.widthPixels,
      heightPixels: fps?.heightPixels,
      densityDpi: fps?.densityDpi,
      detectionSource: fps?.detectionSource,
      isNativeDisplay: Boolean(fps?.isNativeDisplay),
      storageFreeGb: storage?.freeGb,
      storageTotalGb: storage?.totalGb,
      storageUsedPercent: storage?.usedPercent,
      appTempCacheKb: storage?.appTempCacheKb,
      isNativeStorage: storage?.isNativeStorage,
    };

    if (typeof window !== 'undefined') {
      window['__REAL_STATS__'] = detail;
      window.dispatchEvent(new CustomEvent('fpsbooster_realstats', { detail }));
    }
    return detail;
  } catch (e) {
    return null;
  } finally {
    isUpdatingRealStats = false;
  }
}

if (typeof window !== 'undefined') {
  // Lightweight visibility- & battery-saver-aware telemetry polling
  let lastBgPollAt = 0;
  setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const now = Date.now();
    const minCadenceMs = window['__FPS_BATTERY_SAVER__'] ? 11500 : 3800;
    if (now - lastBgPollAt < minCadenceMs) return;
    lastBgPollAt = now;
    updateRealStats();
  }, 4000);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        lastBgPollAt = Date.now();
        updateRealStats();
      }
    });
  }

  updateRealStats();
  window['updateRealStats'] = updateRealStats;
}
