import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  OptimizationProfileMode,
  RemoteOptimizationProfileSpec,
  DeviceCapabilitiesState
} from '../types.ts';

import type { PluginListenerHandle } from '@capacitor/core';

interface GamingEnginePluginInterface {
  getThermalTelemetry(): Promise<{
    isNativeAndroid?: boolean;
    temperatureC?: number;
    batteryTempC?: number;
    cpuTempC?: number;
    skinTempC?: number;
    thermalStatusCode?: number;
    thermalLabel?: string;
    thermalHeadroom?: number;
    batteryLevel?: number;
    isCharging?: boolean;
    sensorSource?: string;
    zones?: { type: string; tempC: number }[];
  }>;
  addListener(
    eventName: 'thermalStatusChanged',
    listenerFunc: (event: { thermalStatusCode: number; thermalLabel: string }) => void
  ): Promise<PluginListenerHandle>;
  getDeviceCapabilities(): Promise<{
    isNativeAndroid?: boolean;
    manufacturer?: string;
    model?: string;
    hardware?: string;
    sdkInt?: number;
    release?: string;
    cpuCores?: number;
    cpuCurMhz?: number;
    cpuMaxMhz?: number;
    activeRefreshHz?: number;
    maxSupportedHz?: number;
    supportedRefreshRates?: number[];
    widthPixels?: number;
    heightPixels?: number;
    densityDpi?: number;
    adpfSupported?: boolean;
    adpfPreferredNanos?: number;
    gameModeApiSupported?: boolean;
    gameModeLabel?: string;
    thermalStatusCode?: number;
    thermalLabel?: string;
    thermalHeadroom?: number;
  }>;
  applyOptimizationProfile(options: {
    profile: OptimizationProfileMode;
    targetFps: number;
    gamePackage?: string;
  }): Promise<{
    applied: boolean;
    profile: string;
    targetFps: number;
    adpfEngaged: boolean;
    gameInstalled: boolean;
  }>;
  getNetworkStats(): Promise<{
    connected: boolean;
    transport: string;
    downstreamKbps: number;
    upstreamKbps: number;
    totalRxBytes: number;
    totalTxBytes: number;
  }>;
}

interface GamingFirewallPluginInterface {
  getFirewallStatus(): Promise<{
    isNativeAndroid: boolean;
    permissionGranted: boolean;
    isVpnRunning: boolean;
    blockedBytes: number;
    blockedPackets: number;
    protectedGamePackage: string;
    activeBlockedPackages: string[];
  }>;
  requestVpnPermission(): Promise<{ granted: boolean }>;
  savePreviousConfig(): Promise<{ saved: boolean; wasRunning: boolean; blockedCount: number }>;
  restorePreviousConfig(): Promise<{ restored: boolean; wasRunning: boolean; blockedCount: number }>;
  startFirewall(options: {
    blockedPackages: string[];
    protectedGamePackage: string;
  }): Promise<{
    started: boolean;
    needsPermission: boolean;
    blockedRequestedCount?: number;
    protectedGamePackage?: string;
  }>;
  stopFirewall(): Promise<{ stopped: boolean }>;
}

export const GamingEngineNative = registerPlugin<GamingEnginePluginInterface>('GamingEngine');
export const GamingFirewallNative = registerPlugin<GamingFirewallPluginInterface>('GamingFirewall');

export const OPTIMIZATION_PROFILES: RemoteOptimizationProfileSpec[] = [
  {
    id: 'SMART_BOOST',
    name: 'Smart Boost',
    description: 'Adapts dynamically to detected display Hz & thermal headroom.',
    targetFps: '90',
    performanceMode: true,
    reduceLag: true,
    improveRendering: true,
    graphicsOptimized: true,
    thermalCapC: 42,
  },
  {
    id: 'PERFORMANCE_MODE',
    name: 'Performance Mode',
    description: 'Engages ADPF CPU/GPU pacing & trims cached background tasks.',
    targetFps: '90',
    performanceMode: true,
    reduceLag: true,
    improveRendering: true,
    graphicsOptimized: true,
    thermalCapC: 44,
  },
  {
    id: 'EXTREME_MODE',
    name: 'Extreme 120Hz',
    description: 'Requests max panel refresh rate & full shader pipeline.',
    targetFps: '120',
    performanceMode: true,
    reduceLag: true,
    improveRendering: true,
    graphicsOptimized: true,
    thermalCapC: 46,
  },
  {
    id: 'BALANCED_MODE',
    name: 'Balanced',
    description: 'Smooth 60 FPS target with controlled battery & heat output.',
    targetFps: '60',
    performanceMode: false,
    reduceLag: true,
    improveRendering: true,
    graphicsOptimized: true,
    thermalCapC: 39,
  },
  {
    id: 'BATTERY_SAVER',
    name: 'Battery Saver',
    description: 'Caps frame rate at 60Hz & limits heavy shader passes.',
    targetFps: '60',
    performanceMode: false,
    reduceLag: true,
    improveRendering: false,
    graphicsOptimized: false,
    thermalCapC: 37,
  },
];

export function isNativeAndroidRuntime(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function queryDeviceCapabilities(detectedHz: number): Promise<DeviceCapabilitiesState> {
  if (isNativeAndroidRuntime()) {
    try {
      const native = await GamingEngineNative.getDeviceCapabilities();
      const rawThermal = (native.thermalLabel || 'UNAVAILABLE').split(' ')[0];
      const validThermal: DeviceCapabilitiesState['thermalStatus'] =
        rawThermal === 'NONE' ||
        rawThermal === 'LIGHT' ||
        rawThermal === 'MODERATE' ||
        rawThermal === 'SEVERE' ||
        rawThermal === 'CRITICAL'
          ? rawThermal
          : 'UNAVAILABLE';

      const gameMode =
        native.gameModeLabel === 'PERFORMANCE' ||
        native.gameModeLabel === 'BATTERY' ||
        native.gameModeLabel === 'STANDARD'
          ? native.gameModeLabel
          : 'UNSUPPORTED';

      const resolvedMaxHz = native.maxSupportedHz || detectedHz || 60;
      const nativeRates =
        Array.isArray(native.supportedRefreshRates) && native.supportedRefreshRates.length > 0
          ? native.supportedRefreshRates.map((r) => Math.round(Number(r))).filter((r) => r >= 30)
          : Array.from(new Set([60, 90, 120, resolvedMaxHz].filter((hz) => hz <= resolvedMaxHz))).sort((a, b) => a - b);

      return {
        isNativeAndroid: true,
        deviceModel: `${native.manufacturer || 'Android'} ${native.model || 'Device'}`.trim(),
        androidSdk: native.sdkInt || 33,
        maxRefreshHz: resolvedMaxHz,
        activeRefreshHz: native.activeRefreshHz || resolvedMaxHz,
        supportedRefreshRates: nativeRates.length > 0 ? nativeRates : [resolvedMaxHz],
        widthPx: native.widthPixels || undefined,
        heightPx: native.heightPixels || undefined,
        densityDpi: native.densityDpi || undefined,
        cpuCores: native.cpuCores || navigator.hardwareConcurrency || 8,
        cpuMaxClockMhz: native.cpuMaxMhz || 2400,
        thermalStatus: validThermal,
        thermalHeadroom: native.thermalHeadroom && native.thermalHeadroom >= 0 ? native.thermalHeadroom : null,
        adpfSupported: Boolean(native.adpfSupported),
        gameModeApiSupported: Boolean(native.gameModeApiSupported),
        gameModeState: gameMode,
        vpnFirewallSupported: true,
      };
    } catch {
      // Fallback safely if plugin call fails on an older ROM
    }
  }

  const webMaxHz = detectedHz || 60;
  const webRates = Array.from(
    new Set([60, ...(webMaxHz >= 75 && webMaxHz < 90 ? [webMaxHz] : []), ...(webMaxHz >= 90 ? [90] : []), ...(webMaxHz >= 120 ? [120] : []), ...(webMaxHz > 120 ? [webMaxHz] : [])])
  ).filter((hz) => hz <= webMaxHz).sort((a, b) => a - b);

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const wPx = typeof window !== 'undefined' && window.screen?.width ? Math.round(window.screen.width * dpr) : undefined;
  const hPx = typeof window !== 'undefined' && window.screen?.height ? Math.round(window.screen.height * dpr) : undefined;

  return {
    isNativeAndroid: false,
    deviceModel: navigator.userAgent.includes('Android') ? 'Android WebView' : 'Browser Preview',
    androidSdk: 0,
    maxRefreshHz: webMaxHz,
    activeRefreshHz: webMaxHz,
    supportedRefreshRates: webRates.length > 0 ? webRates : [webMaxHz],
    widthPx: wPx,
    heightPx: hPx,
    densityDpi: Math.round(dpr * 160),
    cpuCores: navigator.hardwareConcurrency || 4,
    cpuMaxClockMhz: 0,
    thermalStatus: 'UNAVAILABLE',
    thermalHeadroom: null,
    adpfSupported: false,
    gameModeApiSupported: false,
    gameModeState: 'UNSUPPORTED',
    vpnFirewallSupported: false,
  };
}

export async function engageNativeProfile(
  profile: OptimizationProfileMode,
  targetFps: number,
  gamePackage?: string
): Promise<{ nativeApplied: boolean; adpfEngaged: boolean }> {
  if (!isNativeAndroidRuntime()) {
    return { nativeApplied: false, adpfEngaged: false };
  }
  try {
    const res = await GamingEngineNative.applyOptimizationProfile({
      profile,
      targetFps,
      gamePackage: gamePackage || '',
    });
    return { nativeApplied: Boolean(res.applied), adpfEngaged: Boolean(res.adpfEngaged) };
  } catch {
    return { nativeApplied: false, adpfEngaged: false };
  }
}

export function formatBytesCompact(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
