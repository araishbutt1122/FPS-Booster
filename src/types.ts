export type ScreenType = 
  | 'home' 
  | 'fps_graphics' 
  | 'block_apps' 
  | 'dashboard' 
  | 'settings' 
  | 'premium' 
  | 'reward_ad'
  | 'admin'
  | 'privacy_policy';

export type FPSMode = '60' | '90' | '120';

export type Language = 'en' | 'ur';

// STRICTLY 3 METHODS ONLY AS REQUESTED: JazzCash, Easypaisa, Binance
export type PaymentMethodType = 'jazzcash' | 'easypaisa' | 'binance';

export interface AppBlockItem {
  id: string;
  name: string;
  packageName: string;
  category: string;
  isBlocked: boolean;
  blockedDataMb: number;
  iconName: string;
}

export interface GameItem {
  id: string;
  name: string;
  packageName: string;
  genre: string;
  iconColor: string;
}

export interface ProPackage {
  id: string;
  name: string;
  durationLabel: string;
  durationDays: number;
  pricePkr: number;
  originalPricePkr?: number;
  badge?: string;
  perks: string[];
  isPopular?: boolean;
  isVip?: boolean;
}

export interface AdRewardOption {
  id: string;
  adsCount: number;
  durationMinutes: number;
  label: string;
  badge?: string;
  isRecommended?: boolean;
}

export interface TransactionProof {
  id: string;
  userId?: string;
  packageId: string;
  packageName: string;
  amount: number;
  method: PaymentMethodType;
  tid: string;
  senderName: string;
  phone: string;
  screenshotUrl?: string;
  screenshotName?: string;
  ocrTid?: string;
  matchStatus?: 'matched' | 'mismatch' | 'manual_needed';
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  autoApproved?: boolean;
  submittedAt: number; // timestamp ms
  reviewedAt?: number; // timestamp ms
}

export interface AdminWalletStats {
  totalEarningsPkr: number;
  todayEarningsPkr: number;
  weekEarningsPkr: number;
  monthEarningsPkr: number;
  totalProUsers: number;
  methodBreakdown: {
    jazzcash: { amount: number; count: number; currency: 'PKR' };
    easypaisa: { amount: number; count: number; currency: 'PKR' };
    binance: { amount: number; count: number; currency: 'USD' };
  };
}

export interface AdminWalletTransfer {
  id: string;
  mobileNumber: string;
  amount: number;
  note: string;
  date: string;
}

export type OptimizationProfileMode =
  | 'SMART_BOOST'
  | 'PERFORMANCE_MODE'
  | 'EXTREME_MODE'
  | 'BALANCED_MODE'
  | 'BATTERY_SAVER';

export type FirewallPresetMode = 'esports_strict' | 'social_keep' | 'custom';

export interface FpsHistoryPoint {
  timestamp: number;
  fps: number;
  targetFps: number;
  profile: OptimizationProfileMode;
}

export interface CloudRemoteConfig {
  configVersion: string;
  minAppVersion: string;
  serviceStatus: 'operational' | 'degraded' | 'maintenance';
  updateTitle: string;
  updateMessage: string;
  hasImportantUpdate: boolean;
  telemetryEnabled: boolean;
  updatedAt: number;
}

export interface RemoteOptimizationProfileSpec {
  id: OptimizationProfileMode;
  name: string;
  description: string;
  targetFps: FPSMode;
  performanceMode: boolean;
  reduceLag: boolean;
  improveRendering: boolean;
  graphicsOptimized: boolean;
  thermalCapC: number;
}

export interface CloudBackendState {
  status: 'connected' | 'offline_cache' | 'checking' | 'error';
  rttMs: number | null;
  lastSyncedAt: number | null;
  errorMessage?: string;
  remoteConfig: CloudRemoteConfig;
  remoteProfiles: RemoteOptimizationProfileSpec[];
  deviceTier: 'FLAGSHIP' | 'COMPETITIVE' | 'STANDARD' | 'WEB_PREVIEW';
}

export interface FirewallState {
  enabled: boolean;
  hasVpnPermission: boolean;
  isNativeAndroid: boolean;
  preset: FirewallPresetMode;
  protectedGamePkg: string;
  protectedGameName: string;
  blockedBytesTotal: number;
  blockedPacketsCount: number;
  hasPreviousSnapshot: boolean;
  previousSnapshotBlockedIds: string[] | null;
  previousSnapshotEnabled: boolean | null;
}

export interface DeviceCapabilitiesState {
  isNativeAndroid: boolean;
  deviceModel: string;
  androidSdk: number;
  maxRefreshHz: number;
  supportedRefreshRates: number[];
  cpuCores: number;
  cpuMaxClockMhz: number;
  thermalStatus: 'NONE' | 'LIGHT' | 'MODERATE' | 'SEVERE' | 'CRITICAL' | 'UNAVAILABLE';
  thermalHeadroom: number | null;
  adpfSupported: boolean;
  gameModeApiSupported: boolean;
  gameModeState: 'UNSUPPORTED' | 'STANDARD' | 'PERFORMANCE' | 'BATTERY';
  vpnFirewallSupported: boolean;
}

export interface NetworkDiagnosticsState {
  pingMs: number;
  jitterMs: number;
  packetLossPercent: number;
  downloadMbps: number;
  uploadMbps: number;
  stabilityPercent: number;
  connectionType: string;
  isMeasuringSpeed: boolean;
  lastDiagnosticsAt: number | null;
}

export interface SmartSessionState {
  isActive: boolean;
  startedAt: number | null;
  gameName: string;
  gamePackage: string;
  profileUsed: OptimizationProfileMode;
  completedSteps: number[];
  peakTempC: number;
  fpsSamples: number[];
}

export interface CrashDiagnosticItem {
  id: string;
  userId: string;
  message: string;
  stack?: string;
  screen: string;
  platform: string;
  appVersion: string;
  createdAt: number;
}

export interface PerformanceReportItem {
  id: string;
  userId: string;
  gameName: string;
  profileMode: OptimizationProfileMode;
  avgFps: number;
  minFps: number;
  maxFps: number;
  avgPingMs: number;
  packetLossPercent: number;
  peakTempC: number;
  blockedAppsCount: number;
  durationSec: number;
  createdAt: number;
}

export interface StorageStatsState {
  freeGb: number;
  totalGb: number;
  usedPercent: number;
  appTempCacheKb: number;
  isNativeStorage: boolean;
}

export interface PerGameProfile {
  gamePackage: string;
  profileMode: OptimizationProfileMode;
  targetFps: FPSMode;
  resolutionScale: '720p' | '1080p' | 'native';
  firewallPreset: FirewallPresetMode;
  updatedAt: number;
}

export interface BottleneckItem {
  id: string;
  area: 'thermal' | 'ram' | 'network' | 'display' | 'battery';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  recommendation: string;
}

export interface BottleneckReport {
  level: 'optimal' | 'warning' | 'critical';
  summary: string;
  bottlenecks: BottleneckItem[];
  recommendedFps: FPSMode;
  recommendedProfile: OptimizationProfileMode;
}

export type ThermalSeverity = 'normal' | 'warm' | 'high' | 'critical';
export type ThermalTrend = 'cooling' | 'stable' | 'rising';

export interface ThermalZoneReading {
  type: string;
  tempC: number;
}

export interface ThermalHistoryPoint {
  timestamp: number;
  tempC: number;
  severity: ThermalSeverity;
}

export interface ThermalMonitorState {
  currentTempC: number;
  batteryTempC: number | null;
  cpuTempC: number | null;
  skinTempC: number | null;
  peakSessionTempC: number;
  severity: ThermalSeverity;
  trend: ThermalTrend;
  deltaPerMin: number;
  thermalStatus: 'NONE' | 'LIGHT' | 'MODERATE' | 'SEVERE' | 'CRITICAL' | 'EMERGENCY' | 'SHUTDOWN' | 'UNAVAILABLE';
  thermalHeadroom: number | null;
  cpuPressureState: 'nominal' | 'fair' | 'serious' | 'critical' | null;
  sensorSource: string;
  zones: ThermalZoneReading[];
  history: ThermalHistoryPoint[];
  isHighTempWarning: boolean;
  warningMessage: string | null;
  warningDismissedAt: number | null;
  alertThresholdC: number;
  autoCoolEnabled: boolean;
  lastUpdatedAt: number;
}

export interface BoosterState {
  isGamingModeOn: boolean;
  isVpnActive: boolean;
  activeFps: FPSMode;
  activeProfile: OptimizationProfileMode;
  currentFps: number;
  maxHardwareHz: number;
  ramUsagePercent: number;
  ramUsedGb: number;
  totalRamGb: number;
  temperatureC: number;
  batteryLevel: number;
  isBatteryCharging?: boolean;
  pingMs: number;
  isOnline?: boolean;
  storage?: StorageStatsState;
  isBoosting: boolean;
  boostTimeRemainingSec: number;
  boostDurationTotalSec: number;
  isPro: boolean;
  proTier: 'free' | 'day' | 'week' | 'month' | 'vip' | '90day';
  proExpiresAt: number | null;
  graphicsOptimized: boolean;
  performanceMode: boolean;
  reduceLag: boolean;
  improveRendering: boolean;
  antiAliasing: boolean;
  resolutionScale: '720p' | '1080p' | 'native';
  autoBoostOnGameLaunch: boolean;
  deepRamClean: boolean;
  networkOptimizer: boolean;
  appLock: boolean;
  soundAndHaptics: boolean;
  language: Language;
  thermalAlertThresholdC?: number;
  autoCoolOnHighTemp?: boolean;
}
