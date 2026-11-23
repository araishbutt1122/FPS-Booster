import { Capacitor } from '@capacitor/core';
import { RealStats } from '../app.js';
import type { DisplayHardwareInfo } from '../types.ts';
import { GamingEngineNative } from './gamingEngine.ts';

function readBrowserDisplayMetrics(): { widthPx: number; heightPx: number; densityDpi: number } {
  if (typeof window === 'undefined' || !window.screen) {
    return { widthPx: 1080, heightPx: 2400, densityDpi: 420 };
  }
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const widthPx = Math.round((window.screen.width || 390) * dpr);
  const heightPx = Math.round((window.screen.height || 844) * dpr);
  const densityDpi = Math.round(dpr * 160);
  return { widthPx, heightPx, densityDpi };
}

function snapStandardHz(measuredHz: number): number {
  if (measuredHz >= 225) return 240;
  if (measuredHz >= 156) return 165;
  if (measuredHz >= 135) return 144;
  if (measuredHz >= 108) return 120;
  if (measuredHz >= 84) return 90;
  if (measuredHz >= 71) return 75;
  if (measuredHz >= 54) return 60;
  if (measuredHz >= 44) return 48;
  return Math.max(30, Math.min(240, Math.round(measuredHz)));
}

function buildSupportedRatesForMax(maxHz: number): number[] {
  const candidates = [60, 75, 90, 120, 144, 165, 240];
  const rates = candidates.filter((r) => r <= maxHz && (r === 60 || r === 90 || r === 120 || r === maxHz));
  if (!rates.includes(maxHz)) rates.push(maxHz);
  if (!rates.includes(60) && maxHz > 60) rates.unshift(60);
  return Array.from(new Set(rates)).sort((a, b) => a - b);
}

function readInitialSyncDisplayInfo(): DisplayHardwareInfo {
  const metrics = readBrowserDisplayMetrics();
  const screenRefresh =
    typeof window !== 'undefined' && (window.screen as unknown as { refreshRate?: number })?.refreshRate;
  const initialHz =
    screenRefresh && Number(screenRefresh) >= 30 ? Math.round(Number(screenRefresh)) : 60;

  return {
    activeHz: initialHz,
    maxHz: initialHz,
    supportedRates: buildSupportedRatesForMax(initialHz),
    widthPx: metrics.widthPx,
    heightPx: metrics.heightPx,
    densityDpi: metrics.densityDpi,
    detectionSource:
      Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
        ? 'Android WindowManager & DisplayMetrics'
        : screenRefresh
        ? 'Screen API & DisplayMetrics'
        : 'Web VSync & DisplayMetrics',
    isNativeAndroid: Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android',
    isDetecting: false,
    detectedAt: Date.now(),
  };
}

export class RefreshRateDetector {
  private static displayInfo: DisplayHardwareInfo = readInitialSyncDisplayInfo();
  private static activePromise: Promise<DisplayHardwareInfo> | null = null;
  private static hzListeners: ((hz: number) => void)[] = [];
  private static infoListeners: ((info: DisplayHardwareInfo) => void)[] = [];

  public static getDetectedMaxHz(): number {
    return this.displayInfo.maxHz;
  }

  public static getDisplayInfo(): DisplayHardwareInfo {
    return this.displayInfo;
  }

  public static addListener(listener: (hz: number) => void): () => void {
    this.hzListeners.push(listener);
    listener(this.displayInfo.maxHz);
    return () => {
      this.hzListeners = this.hzListeners.filter((l) => l !== listener);
    };
  }

  public static addDisplayListener(listener: (info: DisplayHardwareInfo) => void): () => void {
    this.infoListeners.push(listener);
    listener(this.displayInfo);
    return () => {
      this.infoListeners = this.infoListeners.filter((l) => l !== listener);
    };
  }

  private static publish(nextInfo: DisplayHardwareInfo) {
    this.displayInfo = nextInfo;
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>)['__FPS_BOOSTER_DISPLAY_INFO__'] = nextInfo;
    }
    this.hzListeners.forEach((cb) => cb(nextInfo.maxHz));
    this.infoListeners.forEach((cb) => cb(nextInfo));
  }

  public static async detectHardwareHz(force: boolean = false): Promise<DisplayHardwareInfo> {
    if (typeof window === 'undefined') {
      return this.displayInfo;
    }
    if (this.activePromise && !force) {
      return this.activePromise;
    }

    this.publish({ ...this.displayInfo, isDetecting: true });

    const run = async (): Promise<DisplayHardwareInfo> => {
      const browserMetrics = readBrowserDisplayMetrics();
      const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

      // 1. Native Android DisplayMetrics + WindowManager + Display.getSupportedModes() via RealStats
      try {
        const displayQuery =
          RealStats && typeof RealStats.getDisplayMetrics === 'function'
            ? RealStats.getDisplayMetrics()
            : RealStats && typeof RealStats.getRealFPS === 'function'
            ? RealStats.getRealFPS()
            : null;
        if (displayQuery) {
          const res = await displayQuery;
          const activeRaw = Number(res?.activeRefreshRate ?? res?.refreshRate ?? res?.fps);
          const maxRaw = Number(res?.maxRefreshRate ?? activeRaw);
          if (res && (res.isNativeDisplay || isNativeAndroid) && !Number.isNaN(maxRaw) && maxRaw >= 30) {
            const activeHz = !Number.isNaN(activeRaw) && activeRaw >= 30 ? Math.round(activeRaw) : Math.round(maxRaw);
            const maxHz = Math.max(activeHz, Math.round(maxRaw));
            const supportedRates =
              Array.isArray(res.supportedRefreshRates) && res.supportedRefreshRates.length > 0
                ? Array.from(
                    new Set<number>(
                      res.supportedRefreshRates.map((r: unknown) => Math.round(Number(r))).filter((r: number) => r >= 30)
                    )
                  ).sort((a, b) => a - b)
                : buildSupportedRatesForMax(maxHz);

            const resolved: DisplayHardwareInfo = {
              activeHz,
              maxHz,
              supportedRates: supportedRates.length > 0 ? supportedRates : [maxHz],
              widthPx: Number(res.widthPixels) > 0 ? Number(res.widthPixels) : browserMetrics.widthPx,
              heightPx: Number(res.heightPixels) > 0 ? Number(res.heightPixels) : browserMetrics.heightPx,
              densityDpi: Number(res.densityDpi) > 0 ? Number(res.densityDpi) : browserMetrics.densityDpi,
              detectionSource: String(res.detectionSource || 'Android DisplayMetrics & WindowManager'),
              isNativeAndroid: true,
              isDetecting: false,
              detectedAt: Date.now(),
            };
            this.publish(resolved);
            return resolved;
          }
        }
      } catch {
        // Continue to secondary native/web checks
      }

      // 2. Secondary Native check via GamingEngine.getDeviceCapabilities()
      if (isNativeAndroid) {
        try {
          const caps = await GamingEngineNative.getDeviceCapabilities();
          const maxRaw = Number(caps?.maxSupportedHz);
          if (caps?.isNativeAndroid && !Number.isNaN(maxRaw) && maxRaw >= 30) {
            const activeHz =
              caps.activeRefreshHz && Number(caps.activeRefreshHz) >= 30
                ? Math.round(Number(caps.activeRefreshHz))
                : Math.round(maxRaw);
            const maxHz = Math.max(activeHz, Math.round(maxRaw));
            const supportedRates =
              Array.isArray(caps.supportedRefreshRates) && caps.supportedRefreshRates.length > 0
                ? Array.from(
                    new Set<number>(
                      caps.supportedRefreshRates.map((r) => Math.round(Number(r))).filter((r) => r >= 30)
                    )
                  ).sort((a, b) => a - b)
                : buildSupportedRatesForMax(maxHz);

            const resolved: DisplayHardwareInfo = {
              activeHz,
              maxHz,
              supportedRates,
              widthPx: Number(caps.widthPixels) > 0 ? Number(caps.widthPixels) : browserMetrics.widthPx,
              heightPx: Number(caps.heightPixels) > 0 ? Number(caps.heightPixels) : browserMetrics.heightPx,
              densityDpi: Number(caps.densityDpi) > 0 ? Number(caps.densityDpi) : browserMetrics.densityDpi,
              detectionSource: 'Android WindowManager & DisplayMetrics',
              isNativeAndroid: true,
              isDetecting: false,
              detectedAt: Date.now(),
            };
            this.publish(resolved);
            return resolved;
          }
        } catch {
          // Fall through to browser VSync probing
        }
      }

      // 3. Browser / WebView fallback: window.screen.refreshRate + median requestAnimationFrame VSync pacing
      const screenRefresh = (window.screen as unknown as { refreshRate?: number })?.refreshRate;
      const screenHz = screenRefresh && Number(screenRefresh) >= 30 ? Math.round(Number(screenRefresh)) : null;

      if (typeof document !== 'undefined' && document.hidden) {
        const fallbackHz = screenHz ?? this.displayInfo.maxHz;
        const resolved: DisplayHardwareInfo = {
          activeHz: fallbackHz,
          maxHz: fallbackHz,
          supportedRates: buildSupportedRatesForMax(fallbackHz),
          widthPx: browserMetrics.widthPx,
          heightPx: browserMetrics.heightPx,
          densityDpi: browserMetrics.densityDpi,
          detectionSource: screenHz ? 'Screen API & DisplayMetrics' : 'Web VSync & DisplayMetrics',
          isNativeAndroid: false,
          isDetecting: false,
          detectedAt: Date.now(),
        };
        this.publish(resolved);
        return resolved;
      }

      const measuredHz = await new Promise<number | null>((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        const samples: number[] = [];
        let lastTime = performance.now();

        const sampleFrames = (now: number) => {
          if (typeof document !== 'undefined' && document.hidden) {
            resolve(null);
            return;
          }
          const delta = now - lastTime;
          lastTime = now;

          if (frameCount >= 4 && delta > 3 && delta < 45) {
            samples.push(delta);
          }
          frameCount++;

          if (samples.length < 36 && now - startTime < 750) {
            requestAnimationFrame(sampleFrames);
          } else {
            if (samples.length >= 6) {
              const sorted = [...samples].sort((a, b) => a - b);
              const mid = Math.floor(sorted.length / 2);
              const medianDelta =
                sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
              const rawHz = 1000 / medianDelta;
              resolve(snapStandardHz(rawHz));
            } else {
              resolve(null);
            }
          }
        };

        requestAnimationFrame((t) => {
          lastTime = t;
          requestAnimationFrame(sampleFrames);
        });
      });

      const finalMaxHz = Math.max(screenHz ?? 0, measuredHz ?? 0) || 60;
      const activeHz = measuredHz ?? screenHz ?? 60;
      const resolved: DisplayHardwareInfo = {
        activeHz,
        maxHz: finalMaxHz,
        supportedRates: buildSupportedRatesForMax(finalMaxHz),
        widthPx: browserMetrics.widthPx,
        heightPx: browserMetrics.heightPx,
        densityDpi: browserMetrics.densityDpi,
        detectionSource: screenHz ? 'Screen API & DisplayMetrics' : 'Web VSync & DisplayMetrics',
        isNativeAndroid: false,
        isDetecting: false,
        detectedAt: Date.now(),
      };
      this.publish(resolved);
      return resolved;
    };

    const promise = run().finally(() => {
      if (this.activePromise === promise) {
        this.activePromise = null;
      }
    });
    this.activePromise = promise;
    return promise;
  }
}

// Auto-run one detection pass on module load
if (typeof window !== 'undefined') {
  RefreshRateDetector.detectHardwareHz();
}
