import {
  ThermalHistoryPoint,
  ThermalMonitorState,
  ThermalSeverity,
  ThermalTrend,
  ThermalZoneReading,
} from '../types.ts';
import { GamingEngineNative, isNativeAndroidRuntime } from './gamingEngine.ts';
import { RealStats } from '../app.js';

export interface SystemThermalSample {
  temperatureC: number;
  batteryTempC: number | null;
  cpuTempC: number | null;
  skinTempC: number | null;
  thermalStatus: ThermalMonitorState['thermalStatus'];
  thermalHeadroom: number | null;
  cpuPressureState: ThermalMonitorState['cpuPressureState'];
  sensorSource: string;
  zones: ThermalZoneReading[];
  timestamp: number;
}

let latestCpuPressure: ThermalMonitorState['cpuPressureState'] = null;
let pressureObserverStarted = false;

export function startComputePressureObserver(): () => void {
  if (typeof window === 'undefined' || pressureObserverStarted) {
    return () => {};
  }
  const PressureCtor = (window as unknown as {
    PressureObserver?: new (
      callback: (records: { state: 'nominal' | 'fair' | 'serious' | 'critical' }[]) => void,
      options?: { sampleInterval?: number }
    ) => { observe: (source: string) => Promise<void>; disconnect: () => void };
  }).PressureObserver;

  if (typeof PressureCtor !== 'function') {
    return () => {};
  }

  let observer: { observe: (source: string) => Promise<void>; disconnect: () => void } | null = null;
  try {
    pressureObserverStarted = true;
    observer = new PressureCtor(
      (records) => {
        if (records && records.length > 0) {
          latestCpuPressure = records[records.length - 1].state;
        }
      },
      { sampleInterval: 2000 }
    );
    observer.observe('cpu').catch(() => {
      pressureObserverStarted = false;
    });
  } catch {
    pressureObserverStarted = false;
  }

  return () => {
    try {
      observer?.disconnect();
    } catch {}
    pressureObserverStarted = false;
  };
}

function normalizeThermalLabel(raw?: string): ThermalMonitorState['thermalStatus'] {
  const token = (raw || 'UNAVAILABLE').split(' ')[0].toUpperCase();
  if (
    token === 'NONE' ||
    token === 'LIGHT' ||
    token === 'MODERATE' ||
    token === 'SEVERE' ||
    token === 'CRITICAL' ||
    token === 'EMERGENCY' ||
    token === 'SHUTDOWN'
  ) {
    return token;
  }
  return 'UNAVAILABLE';
}

export async function readSystemThermalData(context: {
  isInGamingSession: boolean;
  activeFps: number;
  isCharging?: boolean;
  lastTempC?: number;
}): Promise<SystemThermalSample> {
  const now = Date.now();

  if (isNativeAndroidRuntime()) {
    try {
      const native = await GamingEngineNative.getThermalTelemetry();
      const temp = typeof native.temperatureC === 'number' ? native.temperatureC : 34.5;
      return {
        temperatureC: Number(temp.toFixed(1)),
        batteryTempC: typeof native.batteryTempC === 'number' ? Number(native.batteryTempC.toFixed(1)) : null,
        cpuTempC: typeof native.cpuTempC === 'number' ? Number(native.cpuTempC.toFixed(1)) : null,
        skinTempC: typeof native.skinTempC === 'number' ? Number(native.skinTempC.toFixed(1)) : null,
        thermalStatus: normalizeThermalLabel(native.thermalLabel),
        thermalHeadroom:
          typeof native.thermalHeadroom === 'number' && native.thermalHeadroom >= 0
            ? Number(native.thermalHeadroom.toFixed(2))
            : null,
        cpuPressureState: latestCpuPressure,
        sensorSource: native.sensorSource || 'Android Thermal HAL + Battery',
        zones: Array.isArray(native.zones) ? native.zones : [],
        timestamp: now,
      };
    } catch {
      try {
        const realTemp = await (RealStats as unknown as {
          getRealTemp: () => Promise<{ temp?: string }>;
        }).getRealTemp();
        const parsed = parseFloat(realTemp?.temp || '34.5');
        return {
          temperatureC: Number((isNaN(parsed) ? 34.5 : parsed).toFixed(1)),
          batteryTempC: Number((isNaN(parsed) ? 34.5 : parsed).toFixed(1)),
          cpuTempC: null,
          skinTempC: null,
          thermalStatus: 'UNAVAILABLE',
          thermalHeadroom: null,
          cpuPressureState: latestCpuPressure,
          sensorSource: 'Android Battery Sensor',
          zones: [],
          timestamp: now,
        };
      } catch {}
    }
  }

  // Browser / WebView fallback: combine Compute Pressure API + Battery Status + real-stats bridge
  let isCharging = Boolean(context.isCharging);
  let batteryLevel = 88;
  try {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      const getBat = (navigator as unknown as {
        getBattery?: () => Promise<{ charging: boolean; level: number }>;
      }).getBattery;
      if (typeof getBat === 'function') {
        const bat = await getBat.call(navigator);
        isCharging = Boolean(bat.charging);
        batteryLevel = Math.round(bat.level * 100);
      }
    }
  } catch {}

  const realStatsWindow =
    typeof window !== 'undefined'
      ? (window as unknown as { __REAL_STATS__?: { temp?: string | number } }).__REAL_STATS__
      : undefined;

  let baseTemp = 34.0;
  if (realStatsWindow?.temp !== undefined) {
    const p = parseFloat(String(realStatsWindow.temp));
    if (!isNaN(p) && p > 15 && p < 90) {
      baseTemp = p;
    }
  } else if (isCharging) {
    baseTemp = 37.2;
  } else if (batteryLevel < 20) {
    baseTemp = 35.8;
  }

  // Compute Pressure API thermal mapping (nominal/fair/serious/critical)
  let pressureBoost = 0;
  let derivedStatus: ThermalMonitorState['thermalStatus'] = 'NONE';
  if (latestCpuPressure === 'critical') {
    pressureBoost = 8.5;
    derivedStatus = 'SEVERE';
  } else if (latestCpuPressure === 'serious') {
    pressureBoost = 5.5;
    derivedStatus = 'MODERATE';
  } else if (latestCpuPressure === 'fair') {
    pressureBoost = 2.5;
    derivedStatus = 'LIGHT';
  }

  // Account smoothly for active sustained workload in browser preview
  const workloadBoost = context.isInGamingSession
    ? context.activeFps >= 120
      ? 2.2
      : context.activeFps >= 90
      ? 1.4
      : 0.7
    : 0;

  const targetTemp = Math.min(48.0, baseTemp + pressureBoost + workloadBoost + (isCharging ? 1.1 : 0));
  const prevTemp = context.lastTempC ?? targetTemp;
  const smoothed = prevTemp + (targetTemp - prevTemp) * 0.35;

  const source = latestCpuPressure
    ? 'Compute Pressure API + Battery'
    : 'Browser Battery + Load Estimate';

  return {
    temperatureC: Number(smoothed.toFixed(1)),
    batteryTempC: Number(baseTemp.toFixed(1)),
    cpuTempC: latestCpuPressure ? Number((smoothed + 2.1).toFixed(1)) : null,
    skinTempC: null,
    thermalStatus: derivedStatus,
    thermalHeadroom:
      latestCpuPressure === 'critical'
        ? 1.02
        : latestCpuPressure === 'serious'
        ? 0.88
        : latestCpuPressure === 'fair'
        ? 0.62
        : 0.25,
    cpuPressureState: latestCpuPressure,
    sensorSource: source,
    zones: [],
    timestamp: now,
  };
}

export function evaluateThermalReading(params: {
  sample: SystemThermalSample;
  prevHistory: ThermalHistoryPoint[];
  peakSessionTempC: number;
  alertThresholdC: number;
  autoCoolEnabled: boolean;
  isInGamingSession: boolean;
  warningDismissedAt: number | null;
}): ThermalMonitorState {
  const { sample, prevHistory, alertThresholdC, autoCoolEnabled, isInGamingSession, warningDismissedAt } = params;
  const temp = sample.temperatureC;

  const isCriticalOs =
    sample.thermalStatus === 'SEVERE' ||
    sample.thermalStatus === 'CRITICAL' ||
    sample.thermalStatus === 'EMERGENCY' ||
    sample.thermalStatus === 'SHUTDOWN' ||
    sample.cpuPressureState === 'critical' ||
    (sample.thermalHeadroom !== null && sample.thermalHeadroom >= 1.0);

  const isModerateOs =
    sample.thermalStatus === 'MODERATE' ||
    sample.cpuPressureState === 'serious' ||
    (sample.thermalHeadroom !== null && sample.thermalHeadroom >= 0.85);

  const isLightOs =
    sample.thermalStatus === 'LIGHT' || sample.cpuPressureState === 'fair';

  let severity: ThermalSeverity = 'normal';
  if (temp >= alertThresholdC + 3 || isCriticalOs) {
    severity = 'critical';
  } else if (temp >= alertThresholdC || isModerateOs) {
    severity = 'high';
  } else if (temp >= alertThresholdC - 3 || isLightOs) {
    severity = 'warm';
  }

  const nextHistory: ThermalHistoryPoint[] = [
    ...prevHistory.slice(-59),
    { timestamp: sample.timestamp, tempC: temp, severity },
  ];

  // Calculate thermal trend (°C/min) across the last ~20–60s window
  let trend: ThermalTrend = 'stable';
  let deltaPerMin = 0;
  if (nextHistory.length >= 3) {
    const compareIdx = Math.max(0, nextHistory.length - 6);
    const baseline = nextHistory[compareIdx];
    const elapsedMin = Math.max(0.05, (sample.timestamp - baseline.timestamp) / 60000);
    deltaPerMin = Number(((temp - baseline.tempC) / elapsedMin).toFixed(2));
    if (deltaPerMin >= 0.35) {
      trend = 'rising';
    } else if (deltaPerMin <= -0.35) {
      trend = 'cooling';
    }
  }

  const isThermalHot = severity === 'high' || severity === 'critical';
  const recentlyDismissed =
    warningDismissedAt !== null &&
    sample.timestamp - warningDismissedAt < 90_000 &&
    severity !== 'critical';

  const isHighTempWarning = isInGamingSession && isThermalHot && !recentlyDismissed;

  let warningMessage: string | null = null;
  if (severity === 'critical') {
    warningMessage = `Critical thermal load (${temp.toFixed(1)}°C${sample.thermalStatus !== 'UNAVAILABLE' ? ` · OS ${sample.thermalStatus}` : ''}). Active thermal throttling can cause severe FPS drops.`;
  } else if (severity === 'high') {
    warningMessage = `Device temperature reached ${temp.toFixed(1)}°C (threshold ${alertThresholdC}°C) during gaming. Consider 60 FPS Balanced mode to prevent throttling.`;
  } else if (severity === 'warm' && isInGamingSession) {
    warningMessage = `Device warming up (${temp.toFixed(1)}°C). Keep ventilation clear during long sessions.`;
  }

  return {
    currentTempC: temp,
    batteryTempC: sample.batteryTempC,
    cpuTempC: sample.cpuTempC,
    skinTempC: sample.skinTempC,
    peakSessionTempC: Math.max(params.peakSessionTempC, temp),
    severity,
    trend,
    deltaPerMin,
    thermalStatus: sample.thermalStatus,
    thermalHeadroom: sample.thermalHeadroom,
    cpuPressureState: sample.cpuPressureState,
    sensorSource: sample.sensorSource,
    zones: sample.zones,
    history: nextHistory,
    isHighTempWarning,
    warningMessage,
    warningDismissedAt: isThermalHot ? warningDismissedAt : null,
    alertThresholdC,
    autoCoolEnabled,
    lastUpdatedAt: sample.timestamp,
  };
}

export function celsiusToFahrenheit(tempC: number): number {
  return Number(((tempC * 9) / 5 + 32).toFixed(1));
}
