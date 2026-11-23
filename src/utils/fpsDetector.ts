import { RealStats } from '../app.js';

export class RefreshRateDetector {
  private static detectedMaxHz: number = 60;
  private static hasNativeOrHighHz: boolean = false;
  private static isDetecting: boolean = false;
  private static listeners: ((hz: number) => void)[] = [];

  public static getDetectedMaxHz(): number {
    return this.detectedMaxHz;
  }

  public static addListener(listener: (hz: number) => void): () => void {
    this.listeners.push(listener);
    listener(this.detectedMaxHz);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify(hz: number) {
    this.detectedMaxHz = hz;
    this.listeners.forEach(cb => cb(hz));
  }

  public static async detectHardwareHz() {
    if (this.isDetecting || typeof window === 'undefined') return;
    this.isDetecting = true;

    // 1. Check Native Capacitor RealStats Plugin first (exact Android Display.getRefreshRate())
    try {
      if (RealStats && typeof RealStats.getRealFPS === 'function') {
        const res = await RealStats.getRealFPS();
        if (res && res.refreshRate && Number(res.refreshRate) >= 50) {
          const nativeHz = Math.round(Number(res.refreshRate));
          this.hasNativeOrHighHz = true;
          this.notify(nativeHz);
          this.isDetecting = false;
          return;
        }
      }
    } catch {
      // Fallback to browser detection if not running inside Android native bridge
    }

    // 2. Check window.screen.refreshRate if exposed by browser/WebView
    const screenRefresh = (window.screen as any)?.refreshRate;
    if (screenRefresh && Number(screenRefresh) >= 50) {
      const hz = Math.round(Number(screenRefresh));
      if (hz > 60) this.hasNativeOrHighHz = true;
      this.notify(hz);
    }

    if (typeof document !== 'undefined' && document.hidden) {
      this.isDetecting = false;
      return;
    }

    // 3. Measure actual requestAnimationFrame pacing in one short burst
    let frameCount = 0;
    const startTime = performance.now();
    const samples: number[] = [];
    let lastTime = performance.now();

    const sampleFrames = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        this.isDetecting = false;
        return;
      }
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      if (frameCount > 5) {
        samples.push(delta);
      }
      frameCount++;

      if (samples.length < 40 && now - startTime < 900) {
        requestAnimationFrame(sampleFrames);
      } else {
        const validSamples = samples.filter(d => d > 3 && d < 40);
        if (validSamples.length > 8) {
          const avgDelta = validSamples.reduce((a, b) => a + b, 0) / validSamples.length;
          const calculatedHz = Math.round(1000 / avgDelta);

          let targetHz = 60;
          if (calculatedHz >= 135) targetHz = 144;
          else if (calculatedHz >= 105) targetHz = 120;
          else if (calculatedHz >= 78) targetHz = 90;
          else targetHz = 60;

          if (targetHz > 60 || !this.hasNativeOrHighHz) {
            this.notify(targetHz);
          }
        }
        this.isDetecting = false;
      }
    };

    requestAnimationFrame(sampleFrames);
  }
}

// Auto-run one detection pass on load
if (typeof window !== 'undefined') {
  RefreshRateDetector.detectHardwareHz();
}
