export class RefreshRateDetector {
  private static detectedMaxHz: number = 60;
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

  public static detectHardwareHz() {
    if (this.isDetecting || typeof window === 'undefined') return;
    this.isDetecting = true;

    let frameCount = 0;
    let startTime = performance.now();
    const samples: number[] = [];
    let lastTime = performance.now();

    const sampleFrames = () => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      if (frameCount > 5) {
        // Skip first warm-up frames
        samples.push(delta);
      }
      frameCount++;

      if (samples.length < 50 && now - startTime < 1200) {
        requestAnimationFrame(sampleFrames);
      } else {
        // Calculate average frame interval
        const validSamples = samples.filter(d => d > 3 && d < 40);
        if (validSamples.length > 10) {
          const avgDelta = validSamples.reduce((a, b) => a + b, 0) / validSamples.length;
          const calculatedHz = Math.round(1000 / avgDelta);

          // Map to standard gaming display thresholds: 60, 90, 120, 144, 165
          let targetHz = 60;
          if (calculatedHz >= 140) targetHz = 144;
          else if (calculatedHz >= 110) targetHz = 120;
          else if (calculatedHz >= 80) targetHz = 90;
          else targetHz = 60;

          this.detectedMaxHz = targetHz;
        } else {
          this.detectedMaxHz = 60;
        }
        this.isDetecting = false;
        this.listeners.forEach(cb => cb(this.detectedMaxHz));
      }
    };

    requestAnimationFrame(sampleFrames);
  }
}

// Auto-run detection on load
if (typeof window !== 'undefined') {
  RefreshRateDetector.detectHardwareHz();
}
