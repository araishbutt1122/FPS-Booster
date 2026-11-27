import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import {
  OptimizationProfileMode,
  RemoteOptimizationProfileSpec,
  DeviceCapabilitiesState,
  AppBlockItem,
  GameItem,
  FPSMode,
  VpnConnectionState,
} from '../types.ts';

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
    validated?: boolean;
    metered?: boolean;
    vpnActiveOnDevice?: boolean;
    transport: string;
    downstreamKbps: number;
    upstreamKbps: number;
    totalRxBytes: number;
    totalTxBytes: number;
    wifiRssi?: number;
    wifiLinkMbps?: number;
    wifiFreqMhz?: number;
  }>;
  probeRealNetworkLatency(options: { hosts: string[] }): Promise<{
    bestHost: string;
    bestPingMs: number;
    bestJitterMs: number;
    bestLossPercent: number;
    externalVpnDetected: boolean;
    results: Array<{
      host: string;
      pingMs: number;
      jitterMs: number;
      packetLossPercent: number;
      reachable: boolean;
    }>;
  }>;
  setScreenBrightness(options: {
    enabled: boolean;
    level?: number;
  }): Promise<{
    applied: boolean;
    enabled: boolean;
    brightness?: number;
  }>;
  getInstalledApps(): Promise<{
    isNativeAndroid: boolean;
    count: number;
    apps: Array<{
      packageName: string;
      name: string;
      category: string;
      isSystem: boolean;
      isGame: boolean;
      iconDataUrl?: string;
    }>;
  }>;
  getInstalledGames(): Promise<{
    isNativeAndroid: boolean;
    count: number;
    games: Array<{
      packageName: string;
      name: string;
      category: string;
      isSystem: boolean;
      isGame: boolean;
      iconDataUrl?: string;
    }>;
  }>;
  launchGamePackage(options: { packageName: string }): Promise<{
    launched: boolean;
    reason?: string;
  }>;
  openStorePage(options: { packageName: string }): Promise<{
    opened: boolean;
    packageName?: string;
  }>;
}

export interface NativeVpnStatusPayload {
  isNativeAndroid: boolean;
  permissionGranted: boolean;
  notificationPermissionGranted?: boolean;
  isVpnRunning: boolean;
  persistentServiceRunning?: boolean;
  wakeLockActive?: boolean;
  heartbeatCount?: number;
  lastHeartbeatAt?: number;
  connectionState?: VpnConnectionState;
  activeTransport?: string;
  reconnectCount?: number;
  lastFailureReason?: string;
  conflictDetected?: boolean;
  uptimeSec?: number;
  vpnLayer?: number;
  firewallLayer?: number;
  layerStatusNote?: string;
  dnsFilterEnabled?: boolean;
  blockedBytes: number;
  blockedPackets: number;
  blockedTcpPackets?: number;
  blockedUdpPackets?: number;
  blockedDnsQueries?: number;
  blockedIpv4Packets?: number;
  blockedIpv6Packets?: number;
  protectedGamePackage: string;
  activeBlockedPackages: string[];
  eventType?: string;
  eventMessage?: string;
}

interface GamingFirewallPluginInterface {
  getFirewallStatus(): Promise<NativeVpnStatusPayload>;
  requestVpnPermission(): Promise<{ granted: boolean }>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  savePreviousConfig(): Promise<{ saved: boolean; wasRunning: boolean; blockedCount: number }>;
  restorePreviousConfig(): Promise<{ restored: boolean; wasRunning: boolean; blockedCount: number }>;
  startFirewall(options: {
    blockedPackages: string[];
    allowedPackages?: string[];
    blockAllNonSelected?: boolean;
    boostExpiresAtMs?: number;
    protectedGamePackage: string;
    dnsFilter?: boolean;
  }): Promise<{
    started: boolean;
    needsPermission: boolean;
    conflictDetected?: boolean;
    persistentServiceStarted?: boolean;
    blockAllNonSelected?: boolean;
    errorReason?: string;
    blockedRequestedCount?: number;
    allowedRequestedCount?: number;
    protectedGamePackage?: string;
    alreadyRunning?: boolean;
  }>;
  stopFirewall(): Promise<{ stopped: boolean }>;
  getPermissionChecklist(): Promise<{
    batteryOptimizationIgnored: boolean;
    usageAccessGranted: boolean;
    dndAccessGranted: boolean;
    notificationGranted: boolean;
    vpnGranted: boolean;
  }>;
  requestBatteryOptimization(): Promise<{ granted: boolean }>;
  requestUsageAccess(): Promise<{ granted: boolean }>;
  requestDndAccess(): Promise<{ granted: boolean }>;
  setDndMode(options: { enabled: boolean }): Promise<{ applied: boolean; granted: boolean; enabled?: boolean }>;
  trimBackgroundApps(options: { packages: string[]; protectedGamePackage: string }): Promise<{
    trimmedCount: number;
    freedMb: number;
  }>;
  addListener(
    eventName: 'vpnStateChanged',
    listenerFunc: (event: NativeVpnStatusPayload) => void
  ): Promise<PluginListenerHandle>;
}

export const GamingEngineNative = registerPlugin<GamingEnginePluginInterface>('GamingEngine');
export const GamingFirewallNative = registerPlugin<GamingFirewallPluginInterface>('GamingFirewall');

export const ESSENTIAL_SYSTEM_PACKAGES = new Set<string>([
  'android',
  'com.fpsbooster.pro',
  'com.android.phone',
  'com.android.server.telecom',
  'com.android.dialer',
  'com.google.android.dialer',
  'com.samsung.android.dialer',
  'com.samsung.android.incallui',
  'com.android.incallui',
  'com.android.emergency',
  'com.android.mms',
  'com.google.android.apps.messaging',
  'com.samsung.android.messaging',
  'com.android.systemui',
  'com.google.android.gms',
  'com.google.android.gsf',
  'com.android.vending',
]);

/**
 * Guarantees that the selected game, calling/emergency packages, and core Android services
 * are NEVER passed into background VPN restriction rules.
 */
export function filterSafeBlockedPackages(
  apps: AppBlockItem[],
  protectedGamePkg: string
): string[] {
  return apps
    .filter(
      (app) =>
        app.isBlocked &&
        app.packageName &&
        app.packageName !== protectedGamePkg &&
        !ESSENTIAL_SYSTEM_PACKAGES.has(app.packageName)
    )
    .map((app) => app.packageName);
}

/**
 * Returns packages explicitly allowed by the user (plus protected game) for exclusion
 * when blockAllNonSelected VPN firewall mode is active.
 */
export function filterAllowedPackages(
  apps: AppBlockItem[],
  protectedGamePkg: string
): string[] {
  const allowed = new Set<string>();
  if (protectedGamePkg) {
    allowed.add(protectedGamePkg);
  }
  for (const app of apps) {
    if (!app.isBlocked && app.packageName) {
      allowed.add(app.packageName);
    }
  }
  return Array.from(allowed);
}

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

export async function applyNativeScreenBrightness(
  enabled: boolean,
  level: number = 0.3
): Promise<boolean> {
  if (!isNativeAndroidRuntime()) return false;
  try {
    const res = await GamingEngineNative.setScreenBrightness({ enabled, level });
    return Boolean(res.applied);
  } catch {
    return false;
  }
}

export async function queryNativePermissionChecklist() {
  if (!isNativeAndroidRuntime()) {
    return {
      batteryOptimizationIgnored: true,
      usageAccessGranted: true,
      dndAccessGranted: true,
      notificationGranted: true,
      vpnGranted: false,
    };
  }
  try {
    return await GamingFirewallNative.getPermissionChecklist();
  } catch {
    return {
      batteryOptimizationIgnored: false,
      usageAccessGranted: false,
      dndAccessGranted: false,
      notificationGranted: true,
      vpnGranted: false,
    };
  }
}

export async function setNativeDndMode(enabled: boolean): Promise<{ applied: boolean; granted: boolean }> {
  if (!isNativeAndroidRuntime()) {
    return { applied: false, granted: false };
  }
  try {
    const res = await GamingFirewallNative.setDndMode({ enabled });
    return { applied: Boolean(res.applied), granted: Boolean(res.granted) };
  } catch {
    return { applied: false, granted: false };
  }
}

export async function trimNativeBackgroundMemory(
  packages: string[],
  protectedGamePackage: string
): Promise<{ trimmedCount: number; freedMb: number }> {
  if (!isNativeAndroidRuntime()) {
    return { trimmedCount: 0, freedMb: 0 };
  }
  try {
    return await GamingFirewallNative.trimBackgroundApps({ packages, protectedGamePackage });
  } catch {
    return { trimmedCount: 0, freedMb: 0 };
  }
}

export async function probeNativeNetworkLatency(hosts: string[]) {
  if (!isNativeAndroidRuntime()) return null;
  try {
    return await GamingEngineNative.probeRealNetworkLatency({ hosts });
  } catch {
    return null;
  }
}

export function formatBytesCompact(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export const ADMOB_CONFIG = {
  BANNER_ID: 'ca-app-pub-8318388001860392/2099191820',
  REWARDED_ID: 'ca-app-pub-8318388001860392/6700927605',
  APP_OPEN_ID: 'ca-app-pub-8318388001860392/8289341446',
};

export function resolveNumericFps(fps: FPSMode | string | undefined, maxHardwareHz: number = 60): number {
  const cap = maxHardwareHz >= 30 ? maxHardwareHz : 60;
  if (fps === 'higher') return cap;
  const parsed = Number(fps);
  return Number.isFinite(parsed) && parsed >= 20 ? parsed : 60;
}

export function mapFpsForFirestore(fps: FPSMode | string | undefined, maxHardwareHz: number = 60): '60' | '90' | '120' {
  const n = resolveNumericFps(fps, maxHardwareHz);
  if (n >= 110) return '120';
  if (n >= 80) return '90';
  return '60';
}

export type AppCategoryType = 'Games' | 'Social' | 'Browsers' | 'Entertainment' | 'Tools' | 'System';

export function categorizePackageName(
  packageName: string,
  appName: string,
  isSystem: boolean = false,
  isGame: boolean = false
): AppCategoryType {
  const p = `${packageName} ${appName}`.toLowerCase();
  if (
    isGame ||
    p.includes('tencent.ig') ||
    p.includes('freefire') ||
    p.includes('callofduty') ||
    p.includes('pubg') ||
    p.includes('roblox') ||
    p.includes('minecraft') ||
    p.includes('mobile.legends') ||
    p.includes('genshin') ||
    p.includes('brawlstars') ||
    p.includes('clash') ||
    p.includes('asphalt') ||
    p.includes('game')
  ) {
    return 'Games';
  }
  if (
    p.includes('whatsapp') ||
    p.includes('instagram') ||
    p.includes('facebook') ||
    p.includes('snapchat') ||
    p.includes('telegram') ||
    p.includes('discord') ||
    p.includes('twitter') ||
    p.includes('barcelona') ||
    p.includes('pinterest') ||
    p.includes('orca') ||
    p.includes('reddit') ||
    p.includes('linkedin')
  ) {
    return 'Social';
  }
  if (
    p.includes('chrome') ||
    p.includes('firefox') ||
    p.includes('opera') ||
    p.includes('brave') ||
    p.includes('edge') ||
    p.includes('ucmobile') ||
    p.includes('browser')
  ) {
    return 'Browsers';
  }
  if (
    p.includes('youtube') ||
    p.includes('netflix') ||
    p.includes('spotify') ||
    p.includes('tiktok') ||
    p.includes('musically') ||
    p.includes('kwai') ||
    p.includes('like') ||
    p.includes('helo') ||
    p.includes('twitch') ||
    p.includes('hotstar') ||
    p.includes('primevideo')
  ) {
    return 'Entertainment';
  }
  if (
    isSystem ||
    p.includes('com.android.') ||
    p.includes('com.google.android.gms') ||
    p.includes('vending') ||
    p.includes('systemui') ||
    p.includes('samsung.android')
  ) {
    return 'System';
  }
  return 'Tools';
}

const GAME_ACCENT_COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#ef4444'];

export const GLOBAL_GAMES_CATALOG: GameItem[] = [
  { id: 'g1', name: 'PUBG Mobile', packageName: 'com.tencent.ig', genre: 'Battle Royale', category: 'Shooter', iconColor: '#f59e0b', source: 'catalog' },
  { id: 'g2', name: 'BGMI', packageName: 'com.pubg.imobile', genre: 'Battle Royale', category: 'Shooter', iconColor: '#10b981', source: 'catalog' },
  { id: 'g3', name: 'Free Fire', packageName: 'com.dts.freefireth', genre: 'Survival Shooter', category: 'Shooter', iconColor: '#ef4444', source: 'catalog' },
  { id: 'g4', name: 'Free Fire MAX', packageName: 'com.dts.freefiremax', genre: 'Ultra Survival', category: 'Shooter', iconColor: '#8b5cf6', source: 'catalog' },
  { id: 'g5', name: 'Call of Duty: Mobile', packageName: 'com.activision.callofduty.shooter', genre: 'Tactical FPS', category: 'Shooter', iconColor: '#06b6d4', source: 'catalog' },
  { id: 'g6', name: 'Warzone Mobile', packageName: 'com.activision.callofduty.warzone', genre: 'Battle Royale', category: 'Shooter', iconColor: '#22d3ee', source: 'catalog' },
  { id: 'g7', name: 'Apex Legends / Blood Strike', packageName: 'com.netease.newspike', genre: 'Fast FPS', category: 'Shooter', iconColor: '#f43f5e', source: 'catalog' },
  { id: 'g8', name: 'Mobile Legends: Bang Bang', packageName: 'com.mobile.legends', genre: 'MOBA 5v5', category: 'MOBA', iconColor: '#3b82f6', source: 'catalog' },
  { id: 'g9', name: 'Honor of Kings', packageName: 'com.levelinfinite.sgameGlobal', genre: 'MOBA 5v5', category: 'MOBA', iconColor: '#f59e0b', source: 'catalog' },
  { id: 'g10', name: 'League of Legends: Wild Rift', packageName: 'com.riotgames.league.wildrift', genre: 'MOBA 5v5', category: 'MOBA', iconColor: '#38bdf8', source: 'catalog' },
  { id: 'g11', name: 'Genshin Impact', packageName: 'com.miHoYo.GenshinImpact', genre: 'Open-World RPG', category: 'RPG', iconColor: '#a855f7', source: 'catalog' },
  { id: 'g12', name: 'Honkai: Star Rail', packageName: 'com.HoYoverse.hkrpgoversea', genre: 'Sci-Fi RPG', category: 'RPG', iconColor: '#818cf8', source: 'catalog' },
  { id: 'g13', name: 'Wuthering Waves', packageName: 'com.kurogame.wutheringwaves.global', genre: 'Action RPG', category: 'RPG', iconColor: '#2dd4bf', source: 'catalog' },
  { id: 'g14', name: 'Fortnite', packageName: 'com.epicgames.fortnite', genre: 'Battle Royale', category: 'Shooter', iconColor: '#60a5fa', source: 'catalog' },
  { id: 'g15', name: 'Roblox', packageName: 'com.roblox.client', genre: 'Sandbox World', category: 'Sandbox', iconColor: '#e11d48', source: 'catalog' },
  { id: 'g16', name: 'Minecraft', packageName: 'com.mojang.minecraftpe', genre: 'Sandbox Survival', category: 'Sandbox', iconColor: '#22c55e', source: 'catalog' },
  { id: 'g17', name: 'Brawl Stars', packageName: 'com.supercell.brawlstars', genre: 'Arena Brawler', category: 'Action', iconColor: '#eab308', source: 'catalog' },
  { id: 'g18', name: 'Clash Royale', packageName: 'com.supercell.clashroyale', genre: 'Real-Time Strategy', category: 'Strategy', iconColor: '#3b82f6', source: 'catalog' },
  { id: 'g19', name: 'Clash of Clans', packageName: 'com.supercell.clashofclans', genre: 'Base Strategy', category: 'Strategy', iconColor: '#f97316', source: 'catalog' },
  { id: 'g20', name: 'EA SPORTS FC Mobile', packageName: 'com.ea.gp.fifamobile', genre: 'Sports Football', category: 'Sports', iconColor: '#10b981', source: 'catalog' },
  { id: 'g21', name: 'eFootball', packageName: 'jp.konami.pesam', genre: 'Sports Football', category: 'Sports', iconColor: '#2563eb', source: 'catalog' },
  { id: 'g22', name: 'Asphalt Legends Unite', packageName: 'com.gameloft.android.ANMP.GloftA9HM', genre: 'Arcade Racing', category: 'Racing', iconColor: '#ec4899', source: 'catalog' },
  { id: 'g23', name: 'CarX Street', packageName: 'com.carxtech.sr', genre: 'Open-World Racing', category: 'Racing', iconColor: '#f43f5e', source: 'catalog' },
  { id: 'g24', name: 'Standoff 2', packageName: 'com.axlebolt.standoff2', genre: 'Competitive FPS', category: 'Shooter', iconColor: '#fb923c', source: 'catalog' },
  { id: 'g25', name: 'Arena Breakout', packageName: 'com.proximabeta.mf.uamo', genre: 'Tactical Extraction', category: 'Shooter', iconColor: '#94a3b8', source: 'catalog' },
];

export async function fetchNativeInstalledApps(): Promise<AppBlockItem[]> {
  if (!isNativeAndroidRuntime()) return [];
  try {
    const res = await GamingEngineNative.getInstalledApps();
    if (!res?.apps || !Array.isArray(res.apps)) return [];
    return res.apps.map((a, idx) => ({
      id: `native_${a.packageName}`,
      name: a.name || a.packageName,
      packageName: a.packageName,
      category: categorizePackageName(a.packageName, a.name, a.isSystem, a.isGame),
      isBlocked: false,
      blockedDataMb: Math.max(2, 24 - (idx % 18)),
      iconName: a.name || a.packageName,
      iconDataUrl: a.iconDataUrl,
      isSystem: Boolean(a.isSystem),
      isGame: Boolean(a.isGame),
      source: 'android_installed',
    }));
  } catch {
    return [];
  }
}

export async function fetchNativeInstalledGames(): Promise<GameItem[]> {
  if (!isNativeAndroidRuntime()) return [];
  try {
    const res = await GamingEngineNative.getInstalledGames();
    if (!res?.games || !Array.isArray(res.games)) return [];
    return res.games.map((g, idx) => ({
      id: `native_game_${g.packageName}`,
      name: g.name || g.packageName,
      packageName: g.packageName,
      genre: g.category || 'Installed Game',
      category: g.category || 'Games',
      iconColor: GAME_ACCENT_COLORS[idx % GAME_ACCENT_COLORS.length],
      iconDataUrl: g.iconDataUrl,
      source: 'android_installed',
      isInstalled: true,
    }));
  } catch {
    return [];
  }
}

export async function launchNativeGamePackage(packageName: string): Promise<{ launched: boolean; reason?: string }> {
  if (!isNativeAndroidRuntime()) {
    return { launched: false, reason: 'web_preview' };
  }
  try {
    return await GamingEngineNative.launchGamePackage({ packageName });
  } catch {
    return { launched: false, reason: 'plugin_error' };
  }
}

export async function openGameStorePage(packageName: string): Promise<{ opened: boolean }> {
  const pkg = packageName.trim();
  if (!pkg) return { opened: false };
  if (isNativeAndroidRuntime()) {
    try {
      const res = await GamingEngineNative.openStorePage({ packageName: pkg });
      return { opened: Boolean(res?.opened) };
    } catch {
      return { opened: false };
    }
  }
  if (typeof document !== 'undefined') {
    const a = document.createElement('a');
    a.href = `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return { opened: true };
  }
  return { opened: false };
}

interface CapacitorAdMobPlugin {
  prepareRewardVideoAd?: (opts: { adId: string }) => Promise<void>;
  showRewardVideoAd?: () => Promise<{ rewarded?: boolean }>;
}

export async function showNativeRewardedAd(): Promise<{ handledNatively: boolean; rewarded: boolean }> {
  if (!isNativeAndroidRuntime()) {
    return { handledNatively: false, rewarded: false };
  }
  try {
    const capPlugins = (window as unknown as { Capacitor?: { Plugins?: { AdMob?: CapacitorAdMobPlugin } } })?.Capacitor?.Plugins;
    const admob = capPlugins?.AdMob;
    if (admob?.prepareRewardVideoAd && admob?.showRewardVideoAd) {
      await admob.prepareRewardVideoAd({ adId: ADMOB_CONFIG.REWARDED_ID });
      const res = await admob.showRewardVideoAd();
      return { handledNatively: true, rewarded: res?.rewarded !== false };
    }
  } catch {
    // Fall back gracefully to verified countdown ad flow if AdMob plugin isn't linked
  }
  return { handledNatively: false, rewarded: false };
}
