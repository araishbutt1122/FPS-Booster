export type ScreenType = 
  | 'home' 
  | 'fps_graphics' 
  | 'block_apps' 
  | 'dashboard' 
  | 'settings' 
  | 'reward_ad'
  | 'admin'
  | 'privacy_policy';

export type FPSMode = '30' | '45' | '60' | '90' | '120' | 'higher';

export type FpsTierKey = '60' | '90' | '120';

export interface FpsUnlockStatus {
  unlocked: boolean;
  unlockedAtMs: number | null;
  expiresAtMs: number | null;
  adsWatched: number;
}

export type Language = 'en' | 'ur';

// Legacy compatibility type
export type PaymentMethodType = 'jazzcash' | 'easypaisa' | 'binance';

export interface AppBlockItem {
  id: string;
  name: string;
  packageName: string;
  category: string;
  isBlocked: boolean;
  blockedDataMb: number;
  iconName: string;
  iconDataUrl?: string;
  isSystem?: boolean;
  isGame?: boolean;
  source?: 'android_installed' | 'catalog';
}

export interface GameItem {
  id: string;
  name: string;
  packageName: string;
  genre: string;
  iconColor: string;
  category?: string;
  iconDataUrl?: string;
  source?: 'android_installed' | 'catalog';
  isInstalled?: boolean;
  isFavorite?: boolean;
  lastPlayedAt?: number;
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

export type VpnConnectionState =
  | 'READY'
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'STANDBY'
  | 'ERROR';

export interface FpsHistoryPoint {
  timestamp: number;
  fps: number;
  targetFps: number;
  profile: OptimizationProfileMode;
  sessionActive?: boolean;
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
  notificationPermissionGranted?: boolean;
  isNativeAndroid: boolean;
  connectionState: VpnConnectionState;
  activeTransport: string;
  reconnectCount: number;
  lastFailureReason: string;
  conflictDetected: boolean;
  uptimeSec: number;
  vpnLayer?: number;
  firewallLayer?: number;
  layerStatusNote?: string;
  dnsFilterEnabled: boolean;
  blockAllNonSelected?: boolean;
  preset: FirewallPresetMode;
  protectedGamePkg: string;
  protectedGameName: string;
  blockedBytesTotal: number;
  blockedPacketsCount: number;
  blockedTcpPackets: number;
  blockedUdpPackets: number;
  blockedDnsQueries: number;
  blockedIpv4Packets: number;
  blockedIpv6Packets: number;
  persistentServiceRunning?: boolean;
  wakeLockActive?: boolean;
  heartbeatCount?: number;
  lastHeartbeatAt?: number;
  hasPreviousSnapshot: boolean;
  previousSnapshotBlockedIds: string[] | null;
  previousSnapshotEnabled: boolean | null;
}

export interface SuperBoostProgressState {
  status: 'idle' | 'activating' | 'active' | 'stopping';
  currentStepIndex: number;
  currentStepLabel: string;
  completedSteps: number[];
  startedAt: number | null;
  selectedGamePackage: string;
  selectedGameName: string;
  errorMessage: string | null;
}

export type PermissionFlowStep = 'battery' | 'usage' | 'dnd' | 'vpn';

export interface PermissionChecklistState {
  batteryOptimizationIgnored: boolean;
  usageAccessGranted: boolean;
  dndAccessGranted: boolean;
  notificationGranted: boolean;
  vpnGranted: boolean;
  onboarded: boolean;
}

export interface BoostSessionSummary {
  protectedGameName: string;
  protectedGamePackage: string;
  profileId: OptimizationProfileMode;
  profileName: string;
  targetFps: FPSMode;
  maxHardwareHz: number;
  vpnConnectionState: VpnConnectionState;
  vpnTransport: string;
  vpnActive: boolean;
  isNativeAndroid: boolean;
  persistentServiceActive: boolean;
  blockedAppsCount: number;
  blockedAppNames: string[];
  dnsFilterEnabled: boolean;
  dndActive: boolean;
  gamingModeActive: boolean;
  ramFreedMb: number;
  ramUsagePercent: number;
  trimmedBackgroundCount: number;
  durationMinutes: number;
  startedAt: number;
}

export interface RecoveryLogItem {
  id: string;
  timestamp: number;
  category: 'vpn' | 'thermal' | 'network' | 'session';
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface DisplayHardwareInfo {
  activeHz: number;
  maxHz: number;
  supportedRates: number[];
  widthPx: number;
  heightPx: number;
  densityDpi: number;
  detectionSource: string;
  isNativeAndroid: boolean;
  isDetecting: boolean;
  detectedAt: number;
}

export interface DeviceCapabilitiesState {
  isNativeAndroid: boolean;
  deviceModel: string;
  androidSdk: number;
  maxRefreshHz: number;
  activeRefreshHz?: number;
  supportedRefreshRates: number[];
  widthPx?: number;
  heightPx?: number;
  densityDpi?: number;
  cpuCores: number;
  cpuMaxClockMhz: number;
  thermalStatus: 'NONE' | 'LIGHT' | 'MODERATE' | 'SEVERE' | 'CRITICAL' | 'UNAVAILABLE';
  thermalHeadroom: number | null;
  adpfSupported: boolean;
  gameModeApiSupported: boolean;
  gameModeState: 'UNSUPPORTED' | 'STANDARD' | 'PERFORMANCE' | 'BATTERY';
  vpnFirewallSupported: boolean;
}

export type ConnectionStabilityStatus =
  | 'optimal'
  | 'good'
  | 'unstable_wifi'
  | 'unstable_mobile'
  | 'vpn_overhead'
  | 'high_latency'
  | 'offline';

export type NetworkQualityLevel = 'green' | 'yellow' | 'red';

export interface PingHistoryPoint {
  timestamp: number;
  pingMs: number;
  jitterMs: number;
  packetLossPercent: number;
  quality: NetworkQualityLevel;
  source: 'websocket' | 'native' | 'http';
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
  stabilityStatus?: ConnectionStabilityStatus;
  stabilityReason?: string;
  vpnOverheadDetected?: boolean;
  routingMode?: 'DIRECT_PHYSICAL' | 'GAME_EXCLUDED_BYPASS' | 'EXTERNAL_VPN_HOP';
  targetAchievable20to40?: boolean;
  wifiRssiDbm?: number;
  wifiLinkMbps?: number;
  wifiBand?: '5GHz' | '2.4GHz' | '6GHz' | null;
  autoOptimizeEnabled?: boolean;
  lastOptimizedAt?: number | null;
  lastOptimizationAction?: string | null;
  isRouteLocked?: boolean;
  fastDnsServer?: string;
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
  boostExpiresAtMs?: number | null;
  activeSessionStartedAtMs?: number | null;
  boostTimeRemainingSec: number;
  boostDurationTotalSec: number;
  fpsUnlocks?: Record<FpsTierKey, FpsUnlockStatus>;
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
  batterySaverMode?: boolean;
  selectedBoostMinutes?: number;
  totalAdsWatched?: number;
  language: Language;
  thermalAlertThresholdC?: number;
  autoCoolOnHighTemp?: boolean;
}
