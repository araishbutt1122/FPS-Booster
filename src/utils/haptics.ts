import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

class HapticsFeedbackManager {
  private enabled: boolean = true;

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private fallbackVibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore browser vibration restrictions
      }
    }
  }

  public async impactLight() {
    if (!this.enabled) return;
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else {
        await Haptics.impact({ style: ImpactStyle.Light }).catch(() => this.fallbackVibrate(12));
      }
    } catch {
      this.fallbackVibrate(12);
    }
  }

  public async impactMedium() {
    if (!this.enabled) return;
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else {
        await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => this.fallbackVibrate(20));
      }
    } catch {
      this.fallbackVibrate(20);
    }
  }

  public async selection() {
    if (!this.enabled) return;
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
        await Haptics.selectionEnd();
      } else {
        await Haptics.selectionChanged().catch(() => this.fallbackVibrate(8));
      }
    } catch {
      this.fallbackVibrate(8);
    }
  }

  public async boostStart() {
    if (!this.enabled) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      setTimeout(() => {
        if (this.enabled) {
          Haptics.notification({ type: NotificationType.Success }).catch(() => {});
        }
      }, 90);
    } catch {
      this.fallbackVibrate([30, 40, 50]);
    }
  }

  public async boostStop() {
    if (!this.enabled) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
      setTimeout(() => {
        if (this.enabled) {
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        }
      }, 70);
    } catch {
      this.fallbackVibrate([25, 30, 15]);
    }
  }

  public async success() {
    if (!this.enabled) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      this.fallbackVibrate([15, 25, 25]);
    }
  }

  public async warning() {
    if (!this.enabled) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      this.fallbackVibrate([35, 35, 35]);
    }
  }

  public async error() {
    if (!this.enabled) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {
      this.fallbackVibrate([50, 40, 50]);
    }
  }
}

export const haptics = new HapticsFeedbackManager();
