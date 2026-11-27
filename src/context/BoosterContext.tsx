import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  BoosterState,
  ScreenType,
  FPSMode,
  FpsTierKey,
  FpsUnlockStatus,
  AppBlockItem,
  GameItem,
  ProPackage,
  AdRewardOption,
  TransactionProof,
  AdminWalletTransfer,
  AdminWalletStats,
  PaymentMethodType,
  Language,
  OptimizationProfileMode,
  FirewallPresetMode,
  FpsHistoryPoint,
  CloudBackendState,
  FirewallState,
  DeviceCapabilitiesState,
  NetworkDiagnosticsState,
  SmartSessionState,
  CrashDiagnosticItem,
  PerformanceReportItem,
  PerGameProfile,
  BottleneckReport,
  BottleneckItem,
  ThermalMonitorState,
  DisplayHardwareInfo,
  SuperBoostProgressState,
  RecoveryLogItem,
  PermissionFlowStep,
  PermissionChecklistState,
  BoostSessionSummary,
} from '../types.ts';
import { sound } from '../utils/audio.ts';
import { haptics } from '../utils/haptics.ts';
import { RefreshRateDetector } from '../utils/fpsDetector.ts';
import {
  ensureAnonymousAuth,
  syncUserToFirestore,
  submitPaymentToFirestore,
  approvePaymentInFirestore,
  rejectPaymentInFirestore,
  uploadScreenshotToStorage,
  measureFirestoreConnection,
  fetchRemoteCloudConfig,
  fetchRemoteOptimizationProfiles,
  syncDeviceCompatibilityToFirestore,
  reportCrashToFirestore,
  savePerformanceReportToFirestore,
  fetchUserPerformanceReports,
  auth,
  db,
} from '../utils/firebase.ts';
import {
  OPTIMIZATION_PROFILES,
  GLOBAL_GAMES_CATALOG,
  GamingEngineNative,
  GamingFirewallNative,
  isNativeAndroidRuntime,
  queryDeviceCapabilities,
  engageNativeProfile,
  applyNativeScreenBrightness,
  filterSafeBlockedPackages,
  filterAllowedPackages,
  queryNativePermissionChecklist,
  setNativeDndMode,
  trimNativeBackgroundMemory,
  probeNativeNetworkLatency,
  fetchNativeInstalledApps,
  fetchNativeInstalledGames,
  launchNativeGamePackage,
  openGameStorePage,
  categorizePackageName,
  resolveNumericFps,
  mapFpsForFirestore,
  NativeVpnStatusPayload,
} from '../utils/gamingEngine.ts';
import {
  readSystemThermalData,
  evaluateThermalReading,
  startComputePressureObserver,
} from '../utils/thermalMonitor.ts';
import {
  runNetworkSpeedDiagnostics,
  measureWarmEndpointRtt,
  classifyConnectionStability,
} from '../utils/networkDiagnostics.ts';
import { scanScreenshotForTid } from '../utils/ocr.ts';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { updateRealStats, clearAppTempCache, getStorageStats } from '../app.js';

// STRICT ONLY 3 PAYMENT DETAILS (AS REQUESTED)
export const JAZZCASH_NUMBER = '03193191407';
export const EASYPAISA_NUMBER = '03193191407';
export const BINANCE_PAY_ID = '980641917';

export interface ServerRegionPing {
  id: string;
  name: string;
  sublabel: string;
  location: string;
  url: string;
  host: string;
  baseLatencyMs: number;
  currentPingMs: number;
  jitterMs: number;
  packetLossPercent: number;
  reachable?: boolean;
  status: 'optimal' | 'good' | 'moderate';
}

export const INITIAL_SERVER_REGIONS: ServerRegionPing[] = [
  {
    id: 'direct-anycast',
    name: 'Direct Anycast Edge (Lowest Hop)',
    sublabel: 'Nearest Non-VPN Direct Routing Node',
    location: 'Nearest Edge',
    url: 'https://1.1.1.1/cdn-cgi/trace',
    host: '1.1.1.1',
    baseLatencyMs: 0,
    currentPingMs: 0,
    jitterMs: 0,
    packetLossPercent: 0.0,
    reachable: true,
    status: 'optimal',
  },
  {
    id: 'asia-south',
    name: 'Asia South (Mumbai)',
    sublabel: 'Free Fire & BGMI Matchmaking',
    location: 'Mumbai, IN',
    url: 'https://cloudflare.com/cdn-cgi/trace',
    host: 'cloudflare.com',
    baseLatencyMs: 0,
    currentPingMs: 0,
    jitterMs: 0,
    packetLossPercent: 0.0,
    reachable: true,
    status: 'good',
  },
  {
    id: 'asia-se',
    name: 'Asia Southeast (Singapore)',
    sublabel: 'COD Mobile & MLBB SEA Hub',
    location: 'Singapore, SG',
    url: 'https://dns.google/resolve?name=example.com&type=A',
    host: '8.8.8.8',
    baseLatencyMs: 0,
    currentPingMs: 0,
    jitterMs: 0,
    packetLossPercent: 0.0,
    reachable: true,
    status: 'good',
  },
  {
    id: 'me-gulf',
    name: 'Middle East (Dubai / Bahrain)',
    sublabel: 'MENA Esports Relay Server',
    location: 'Dubai, UAE',
    url: 'https://9.9.9.9',
    host: '9.9.9.9',
    baseLatencyMs: 0,
    currentPingMs: 0,
    jitterMs: 0,
    packetLossPercent: 0.0,
    reachable: true,
    status: 'good',
  },
  {
    id: 'eu-central',
    name: 'Europe Central (Frankfurt)',
    sublabel: 'EU Battle Royale Cluster',
    location: 'Frankfurt, DE',
    url: 'https://aws.amazon.com',
    host: 'aws.amazon.com',
    baseLatencyMs: 0,
    currentPingMs: 0,
    jitterMs: 0,
    packetLossPercent: 0.0,
    reachable: true,
    status: 'moderate',
  },
  {
    id: 'us-east',
    name: 'North America (US East)',
    sublabel: 'Global Championship Route',
    location: 'Virginia, US',
    url: 'https://www.google.com',
    host: 'www.google.com',
    baseLatencyMs: 0,
    currentPingMs: 0,
    jitterMs: 0,
    packetLossPercent: 0.0,
    reachable: true,
    status: 'moderate',
  },
];

interface BoosterContextType {
  state: BoosterState;
  currentScreen: ScreenType;
  setCurrentScreen: (screen: ScreenType) => void;
  appsList: AppBlockItem[];
  gamesList: GameItem[];
  packages: ProPackage[];
  adOptions: AdRewardOption[];
  transactions: TransactionProof[];
  walletTransfers: AdminWalletTransfer[];
  adminStats: AdminWalletStats;
  autoApproveEnabled: boolean;
  setAutoApproveEnabled: (enabled: boolean) => void;
  activeGame: GameItem | null;
  logs: string[];
  userId: string;
  userPaymentNotification: { message: string; type: 'success' | 'error' | 'info' } | null;
  snackBarMessage: string | null;
  setSnackBarMessage: (msg: string | null) => void;
  clearPaymentNotification: () => void;

  // Global Game Library & Native PackageManager Discovery
  refreshInstalledPackages: () => Promise<void>;
  isRefreshingPackages: boolean;
  catalogSource: 'android_packagemanager' | 'catalog';
  favoriteGamePackages: string[];
  recentGamePackages: string[];
  toggleFavoriteGame: (packageName: string) => void;
  markGamePlayed: (packageName: string) => void;
  launchSelectedGame: (game: GameItem) => Promise<void>;
  installGameFromStore: (game: GameItem) => Promise<void>;
  resetAppBlockRules: () => void;

  // Unified Real-Time Ping Monitor & Network Optimization Engine
  serverRegions: ServerRegionPing[];
  selectedRegionId: string;
  activeRegion: ServerRegionPing;
  isProbing: boolean;
  lastProbedTime: string;
  runPingProbe: (onlyActiveRegion?: boolean) => Promise<void>;
  selectPingRegion: (regionId: string) => void;
  networkDiagnostics: NetworkDiagnosticsState;
  runFullNetworkDiagnostics: () => Promise<void>;
  optimizeNetworkRoute: (reason?: string) => Promise<void>;
  toggleAutoOptimizeNetwork: () => void;

  // 30-Min FPS History, Per-Game Profiles & Bottleneck Detector
  fpsHistory: FpsHistoryPoint[];
  applyOptimizationProfile: (
    profile: OptimizationProfileMode,
    gamePkg?: string,
    options?: { skipFirestoreSync?: boolean; preserveSessionState?: boolean }
  ) => Promise<void>;
  perGameProfiles: Record<string, PerGameProfile>;
  updatePerGameProfile: (gamePackage: string, patch: Partial<PerGameProfile>) => void;
  bottleneckReport: BottleneckReport;

  // Cloud Backend & Diagnostics
  cloudBackend: CloudBackendState;
  syncCloudBackend: () => Promise<void>;
  deviceCapabilities: DeviceCapabilitiesState;
  displayInfo: DisplayHardwareInfo;
  redetectRefreshRate: () => Promise<DisplayHardwareInfo>;
  performanceReports: PerformanceReportItem[];
  crashDiagnostics: CrashDiagnosticItem[];
  logCrashDiagnostic: (message: string, stack?: string, screen?: string) => Promise<void>;
  submitManualPerformanceSnapshot: () => Promise<void>;

  // Local VPN Firewall Rules & Smart Session (Activation unified under Boost ON/OFF)
  firewallState: FirewallState;
  toggleDnsFilter: () => void;
  toggleBlockAllNonSelected: () => void;
  requestFirewallVpnPermission: () => Promise<boolean>;
  setProtectedGame: (game: GameItem) => Promise<void>;
  applyFirewallPreset: (preset: FirewallPresetMode) => Promise<void>;
  restorePreviousFirewallRules: () => Promise<void>;
  smartSession: SmartSessionState;

  // Unified One-Tap Super Boost Master Control & Recovery Watchdog
  masterBoostActive: boolean;
  superBoost: SuperBoostProgressState;
  selectedSuperBoostGamePkg: string;
  setSelectedSuperBoostGamePkg: (pkg: string) => void;
  recoveryHistory: RecoveryLogItem[];
  handleToggleBoost: (game?: GameItem) => Promise<void>;
  activateSuperBoost: (game?: GameItem) => Promise<void>;
  stopSuperBoost: () => Promise<void>;
  isBoostDetailsOpen: boolean;
  setIsBoostDetailsOpen: (open: boolean) => void;
  boostDetailsSummary: BoostSessionSummary | null;
  permissionFlow: {
    isOpen: boolean;
    currentStep: PermissionFlowStep | null;
    stepsQueue: PermissionFlowStep[];
    checklist: PermissionChecklistState;
    isRequesting: boolean;
    pendingGame: GameItem | null;
  };
  handlePermissionFlowAllow: () => Promise<void>;
  requestSequentialBoostPermissions: () => Promise<PermissionChecklistState>;
  skipPermissionFlowStep: () => void;
  closePermissionFlow: () => void;

  // Device Temperature Monitor & High-Temp Gaming Warnings
  thermalMonitor: ThermalMonitorState;
  refreshThermalTelemetry: () => Promise<void>;
  setThermalAlertThreshold: (celsius: number) => void;
  toggleAutoCoolOnHighTemp: () => void;
  dismissThermalWarning: () => void;
  applyThermalCooldownProfile: () => Promise<void>;

  // Actions
  setFpsMode: (mode: FPSMode) => void;
  toggleAppBlock: (id: string) => void;
  toggleAllAppsBlock: (blockAll: boolean) => void;
  toggleBatterySaver: () => Promise<void>;
  cleanRam: () => { freedMb: number; newPercent: number };
  refreshHardwareTelemetry: () => Promise<void>;
  clearTemporaryCache: () => Promise<{ freedKb: number; remainingCacheKb: number; freeGb: string; totalGb: string }>;
  applyGraphicsSettings: (settings: Partial<BoosterState>) => void;
  updateSetting: <K extends keyof BoosterState>(key: K, value: BoosterState[K]) => void;
  launchGameWithAutoBoost: (game: GameItem) => void;
  stopGamingMode: () => void;

  // Boost Timer Duration Preset & Rewarded Ad Time Grant (Executed via Unified Boost ON/OFF)
  setBoostDurationPreset: (durationMinutes: number, targetFps?: FPSMode, label?: string) => void;
  grantAdBoostTime: (durationMinutes: number, adsWatched?: number, label?: string) => void;
  unlockFpsWithAd: (tier: FpsTierKey) => void;
  isFpsTierUnlocked: (mode: FPSMode) => boolean;
  resetNetworkInterfaceAndRoute: () => Promise<void>;

  // User Payment & Auto-Approval Logic (Firestore Synced)
  submitTransaction: (data: {
    packageId: string;
    packageName: string;
    amount: number;
    method: PaymentMethodType;
    tid: string;
    senderName: string;
    phone: string;
    screenshotUrl?: string;
    screenshotName?: string;
    screenshotFile?: File;
  }) => Promise<{
    success: boolean;
    message: string;
    isMatched?: boolean;
    ocrTid?: string;
    reason?: string;
  }>;
  approveTransaction: (id: string) => void;
  rejectTransaction: (id: string, reason?: string) => void;
  sendMoneyFromWallet: (mobileNumber: string, amount: number, note: string) => boolean;
  activateProForTest: (tier: BoosterState['proTier'], days: number) => void;
  setLanguage: (lang: Language) => void;
}

// 25 background apps (Default 4 Blocked: YouTube, Instagram, Facebook, Netflix)
const INITIAL_DATA_HUNGRY_APPS: AppBlockItem[] = [
  { id: 'app_3', name: 'YouTube', packageName: 'com.google.android.youtube', category: 'Entertainment', isBlocked: true, blockedDataMb: 45.0, iconName: 'youtube', source: 'catalog' },
  { id: 'app_4', name: 'Instagram', packageName: 'com.instagram.android', category: 'Social', isBlocked: true, blockedDataMb: 32.5, iconName: 'instagram', source: 'catalog' },
  { id: 'app_5', name: 'Facebook', packageName: 'com.facebook.katana', category: 'Social', isBlocked: true, blockedDataMb: 26.5, iconName: 'facebook', source: 'catalog' },
  { id: 'app_6', name: 'Netflix', packageName: 'com.netflix.mediaclient', category: 'Entertainment', isBlocked: true, blockedDataMb: 21.0, iconName: 'netflix', source: 'catalog' },
  { id: 'app_7', name: 'Snapchat', packageName: 'com.snapchat.android', category: 'Social', isBlocked: false, blockedDataMb: 19.5, iconName: 'snapchat', source: 'catalog' },
  { id: 'app_8', name: 'Messenger', packageName: 'com.facebook.orca', category: 'Social', isBlocked: false, blockedDataMb: 18.2, iconName: 'messenger', source: 'catalog' },
  { id: 'app_1', name: 'WhatsApp', packageName: 'com.whatsapp', category: 'Social', isBlocked: false, blockedDataMb: 68.5, iconName: 'whatsapp', source: 'catalog' },
  { id: 'app_2', name: 'TikTok', packageName: 'com.zhiliaoapp.musically', category: 'Entertainment', isBlocked: false, blockedDataMb: 52.0, iconName: 'tiktok', source: 'catalog' },
  { id: 'app_9', name: 'Chrome', packageName: 'com.android.chrome', category: 'Browsers', isBlocked: false, blockedDataMb: 16.4, iconName: 'chrome', source: 'catalog' },
  { id: 'app_10', name: 'Spotify', packageName: 'com.spotify.music', category: 'Entertainment', isBlocked: false, blockedDataMb: 15.0, iconName: 'spotify', source: 'catalog' },
  { id: 'app_11', name: 'CapCut', packageName: 'com.lemon.lvoverseas', category: 'Tools', isBlocked: false, blockedDataMb: 14.1, iconName: 'capcut', source: 'catalog' },
  { id: 'app_12', name: 'ShareIt', packageName: 'com.lenovo.anyshare.gps', category: 'Tools', isBlocked: false, blockedDataMb: 12.8, iconName: 'shareit', source: 'catalog' },
  { id: 'app_13', name: 'X (Twitter)', packageName: 'com.twitter.android', category: 'Social', isBlocked: false, blockedDataMb: 11.5, iconName: 'twitter', source: 'catalog' },
  { id: 'app_14', name: 'Threads', packageName: 'com.instagram.barcelona', category: 'Social', isBlocked: false, blockedDataMb: 10.2, iconName: 'threads', source: 'catalog' },
  { id: 'app_15', name: 'Telegram', packageName: 'org.telegram.messenger', category: 'Social', isBlocked: false, blockedDataMb: 9.8, iconName: 'telegram', source: 'catalog' },
  { id: 'app_16', name: 'Google Photos', packageName: 'com.google.android.apps.photos', category: 'Tools', isBlocked: false, blockedDataMb: 8.6, iconName: 'photos', source: 'catalog' },
  { id: 'app_17', name: 'Google Play Store', packageName: 'com.android.vending', category: 'System', isBlocked: false, blockedDataMb: 7.9, iconName: 'play store', isSystem: true, source: 'catalog' },
  { id: 'app_18', name: 'Google Play Services', packageName: 'com.google.android.gms', category: 'System', isBlocked: false, blockedDataMb: 7.1, iconName: 'play services', isSystem: true, source: 'catalog' },
  { id: 'app_19', name: 'Google Maps', packageName: 'com.google.android.apps.maps', category: 'Tools', isBlocked: false, blockedDataMb: 6.4, iconName: 'maps', source: 'catalog' },
  { id: 'app_20', name: 'Pinterest', packageName: 'com.pinterest', category: 'Social', isBlocked: false, blockedDataMb: 5.8, iconName: 'pinterest', source: 'catalog' },
  { id: 'app_21', name: 'Gmail', packageName: 'com.google.android.gm', category: 'Tools', isBlocked: false, blockedDataMb: 5.2, iconName: 'gmail', source: 'catalog' },
  { id: 'app_22', name: 'Google Drive', packageName: 'com.google.android.apps.docs', category: 'Tools', isBlocked: false, blockedDataMb: 4.5, iconName: 'drive', source: 'catalog' },
  { id: 'app_23', name: 'Snack Video', packageName: 'com.kwai.video', category: 'Entertainment', isBlocked: false, blockedDataMb: 3.9, iconName: 'snack', source: 'catalog' },
  { id: 'app_24', name: 'Likee', packageName: 'video.like', category: 'Entertainment', isBlocked: false, blockedDataMb: 3.1, iconName: 'likee', source: 'catalog' },
  { id: 'app_25', name: 'Helo', packageName: 'com.eterno.shortvideos', category: 'Social', isBlocked: false, blockedDataMb: 2.4, iconName: 'helo', source: 'catalog' },
];

const deduplicateGames = (games: GameItem[]): GameItem[] => {
  const seen = new Set<string>();
  return games.filter(g => {
    if (seen.has(g.packageName)) return false;
    seen.add(g.packageName);
    return true;
  });
};

const INITIAL_GAMES = deduplicateGames(GLOBAL_GAMES_CATALOG);

const DEFAULT_FPS_UNLOCKS: Record<FpsTierKey, FpsUnlockStatus> = {
  '60': { unlocked: false, unlockedAtMs: null, expiresAtMs: null, adsWatched: 0 },
  '90': { unlocked: false, unlockedAtMs: null, expiresAtMs: null, adsWatched: 0 },
  '120': { unlocked: false, unlockedAtMs: null, expiresAtMs: null, adsWatched: 0 },
};

const PACKAGES: ProPackage[] = [];

// WATCH AD -> EARN BOOST TIME OPTIONS
const AD_OPTIONS: AdRewardOption[] = [
  { id: 'ad_30m', adsCount: 1, durationMinutes: 30, label: 'Watch 1 Ad -> +30 Min Boost', badge: 'RECOMMENDED', isRecommended: true },
  { id: 'ad_60m', adsCount: 2, durationMinutes: 60, label: 'Watch 2 Ads -> +60 Min Boost', badge: 'POPULAR' },
  { id: 'ad_120m', adsCount: 3, durationMinutes: 120, label: 'Watch 3 Ads -> +120 Min Boost', badge: 'MAX TIME' },
];

const BoosterContext = createContext<BoosterContextType | undefined>(undefined);

export const BoosterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [appsList, setAppsList] = useState<AppBlockItem[]>(() => {
    try {
      const saved = localStorage.getItem('fps_booster_apps_v6');
      if (saved) {
        const parsed = JSON.parse(saved) as AppBlockItem[];
        return parsed.map((a) => ({
          ...a,
          category: categorizePackageName(a.packageName, a.name, a.isSystem, a.isGame),
          source: a.source || 'catalog',
        }));
      }
    } catch {}
    return INITIAL_DATA_HUNGRY_APPS;
  });
  const [gamesList, setGamesList] = useState<GameItem[]>(INITIAL_GAMES);
  const [isRefreshingPackages, setIsRefreshingPackages] = useState<boolean>(false);
  const [catalogSource, setCatalogSource] = useState<'android_packagemanager' | 'catalog'>(() =>
    isNativeAndroidRuntime() ? 'android_packagemanager' : 'catalog'
  );
  const [favoriteGamePackages, setFavoriteGamePackages] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('fps_booster_favorite_games_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [recentGamePackages, setRecentGamePackages] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('fps_booster_recent_games_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [activeGame, setActiveGame] = useState<GameItem | null>(null);

  // User Anonymous Auth ID
  const [userId, setUserId] = useState<string>(() => {
    return localStorage.getItem('fps_booster_user_uid') || `user_${Math.random().toString(36).substring(2, 9)}`;
  });

  // Diagnostics Admin toggle
  const [autoApproveEnabled, setAutoApproveEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('fps_booster_auto_approve');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [snackBarMessage, setSnackBarMessage] = useState<string | null>(null);

  // Cloud log records (synced when applicable)
  const [transactions, setTransactions] = useState<TransactionProof[]>([]);

  const [walletTransfers, setWalletTransfers] = useState<AdminWalletTransfer[]>(() => {
    const saved = localStorage.getItem('fps_booster_wallet_transfers_v4');
    return saved ? JSON.parse(saved) : [];
  });

  const [userPaymentNotification, setUserPaymentNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [logs, setLogs] = useState<string[]>([
    'System ready: Global Game Booster Engine online',
    'Firebase Firestore initialized: Online sync connected',
    'Ad-Powered Boost Gate active: Watch Ad to start Boost countdown',
    'Fast DNS 1.1.1.1 & Direct Ping Guard ready',
  ]);

  // Initial State loaded from localStorage or default
  const [state, setState] = useState<BoosterState>(() => {
    const now = Date.now();
    const saved = localStorage.getItem('fps_booster_state_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.isPro = false;
        parsed.proTier = 'free';
        parsed.proExpiresAt = null;
        if (!parsed.activeProfile) {
          parsed.activeProfile = 'SMART_BOOST';
        }
        if (typeof parsed.batterySaverMode !== 'boolean') {
          parsed.batterySaverMode = false;
        }
        if (!parsed.selectedBoostMinutes) {
          parsed.selectedBoostMinutes = 30;
        }
        const savedExpiresAt =
          typeof parsed.boostExpiresAtMs === 'number' && parsed.boostExpiresAtMs > now
            ? parsed.boostExpiresAtMs
            : null;
        const remainingFromExpiry = savedExpiresAt
          ? Math.max(0, Math.ceil((savedExpiresAt - now) / 1000))
          : 0;
        parsed.boostExpiresAtMs = savedExpiresAt;
        parsed.boostTimeRemainingSec = remainingFromExpiry;
        delete parsed.earnedBoostSeconds;
        if (!savedExpiresAt || remainingFromExpiry <= 0) {
          parsed.isBoosting = false;
          parsed.isGamingModeOn = false;
          parsed.isVpnActive = false;
          parsed.activeSessionStartedAtMs = null;
        }
        const normalizedUnlocks: Record<FpsTierKey, FpsUnlockStatus> = {
          '60': { ...DEFAULT_FPS_UNLOCKS['60'] },
          '90': { ...DEFAULT_FPS_UNLOCKS['90'] },
          '120': { ...DEFAULT_FPS_UNLOCKS['120'] },
        };
        if (parsed.fpsUnlocks) {
          (['60', '90', '120'] as FpsTierKey[]).forEach((tier) => {
            const entry = parsed.fpsUnlocks[tier];
            if (entry && entry.unlocked && (!entry.expiresAtMs || entry.expiresAtMs > now)) {
              normalizedUnlocks[tier] = entry;
            }
          });
        }
        parsed.fpsUnlocks = normalizedUnlocks;
        if (typeof parsed.totalAdsWatched !== 'number') {
          parsed.totalAdsWatched = 0;
        }
        parsed.maxHardwareHz = RefreshRateDetector.getDetectedMaxHz();
        return parsed;
      } catch {}
    }
    return {
      isGamingModeOn: false,
      isVpnActive: false,
      activeFps: '60',
      activeProfile: 'SMART_BOOST',
      currentFps: RefreshRateDetector.getDisplayInfo().activeHz || 60,
      maxHardwareHz: RefreshRateDetector.getDetectedMaxHz(),
      ramUsagePercent: 35,
      ramUsedGb: 1.4,
      totalRamGb: 4.0,
      temperatureC: 34.2,
      batteryLevel: 88,
      isBatteryCharging: false,
      pingMs: 0,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      storage: {
        freeGb: 28.4,
        totalGb: 64.0,
        usedPercent: 56,
        appTempCacheKb: 0,
        isNativeStorage: false,
      },
      isBoosting: false,
      boostExpiresAtMs: null,
      activeSessionStartedAtMs: null,
      boostTimeRemainingSec: 0,
      boostDurationTotalSec: 0,
      fpsUnlocks: {
        '60': { ...DEFAULT_FPS_UNLOCKS['60'] },
        '90': { ...DEFAULT_FPS_UNLOCKS['90'] },
        '120': { ...DEFAULT_FPS_UNLOCKS['120'] },
      },
      selectedBoostMinutes: 30,
      totalAdsWatched: 0,
      isPro: false,
      proTier: 'free',
      proExpiresAt: null,
      graphicsOptimized: true,
      performanceMode: true,
      reduceLag: true,
      improveRendering: true,
      antiAliasing: true,
      resolutionScale: 'native',
      autoBoostOnGameLaunch: true,
      deepRamClean: true,
      networkOptimizer: true,
      appLock: false,
      soundAndHaptics: true,
      batterySaverMode: false,
      language: 'en',
    };
  });

  // Per-Game Optimization Profiles (persisted cleanly per game packageName)
  const [perGameProfiles, setPerGameProfiles] = useState<Record<string, PerGameProfile>>(() => {
    try {
      const raw = localStorage.getItem('fps_booster_per_game_profiles_v1');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      'com.tencent.ig': {
        gamePackage: 'com.tencent.ig',
        profileMode: 'PERFORMANCE_MODE',
        targetFps: '90',
        resolutionScale: 'native',
        firewallPreset: 'esports_strict',
        updatedAt: Date.now(),
      },
      'com.dts.freefireth': {
        gamePackage: 'com.dts.freefireth',
        profileMode: 'SMART_BOOST',
        targetFps: '60',
        resolutionScale: 'native',
        firewallPreset: 'social_keep',
        updatedAt: Date.now(),
      },
      'com.activision.callofduty.shooter': {
        gamePackage: 'com.activision.callofduty.shooter',
        profileMode: 'EXTREME_MODE',
        targetFps: '120',
        resolutionScale: '1080p',
        firewallPreset: 'esports_strict',
        updatedAt: Date.now(),
      },
    };
  });

  // 30-Minute FPS History State (D3.js telemetry series)
  const [fpsHistory, setFpsHistory] = useState<FpsHistoryPoint[]>(() => {
    try {
      const raw = localStorage.getItem('fps_booster_fps_history_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as FpsHistoryPoint[];
        const cutoff = Date.now() - 30 * 60 * 1000;
        return parsed.filter((pt) => pt.timestamp >= cutoff);
      }
    } catch {}
    return [
      {
        timestamp: Date.now() - 5000,
        fps: 60,
        targetFps: 60,
        profile: 'SMART_BOOST',
      },
    ];
  });

  // Cloud Backend State (Genuine Firestore RTT + Config + Remote Profiles)
  const [cloudBackend, setCloudBackend] = useState<CloudBackendState>({
    status: 'checking',
    rttMs: null,
    lastSyncedAt: null,
    remoteConfig: {
      configVersion: 'v3.2.0',
      minAppVersion: '2.4.0',
      serviceStatus: 'operational',
      updateTitle: '',
      updateMessage: '',
      hasImportantUpdate: false,
      telemetryEnabled: true,
      updatedAt: Date.now(),
    },
    remoteProfiles: OPTIMIZATION_PROFILES,
    deviceTier: isNativeAndroidRuntime() ? 'COMPETITIVE' : 'WEB_PREVIEW',
  });

  // Real Display Hardware Info (WindowManager / DisplayMetrics / VSync)
  const [displayInfo, setDisplayInfo] = useState<DisplayHardwareInfo>(() =>
    RefreshRateDetector.getDisplayInfo()
  );

  // Device Capabilities State (ADPF, GameManager, Thermal, Display Hz)
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilitiesState>(() => {
    const initialDisplay = RefreshRateDetector.getDisplayInfo();
    return {
      isNativeAndroid: isNativeAndroidRuntime(),
      deviceModel: navigator.userAgent.includes('Android') ? 'Android WebView' : 'Browser Preview',
      androidSdk: 0,
      maxRefreshHz: initialDisplay.maxHz,
      activeRefreshHz: initialDisplay.activeHz,
      supportedRefreshRates: initialDisplay.supportedRates,
      widthPx: initialDisplay.widthPx,
      heightPx: initialDisplay.heightPx,
      densityDpi: initialDisplay.densityDpi,
      cpuCores: navigator.hardwareConcurrency || 8,
      cpuMaxClockMhz: 0,
      thermalStatus: 'UNAVAILABLE',
      thermalHeadroom: null,
      adpfSupported: false,
      gameModeApiSupported: false,
      gameModeState: 'UNSUPPORTED',
      vpnFirewallSupported: isNativeAndroidRuntime(),
    };
  });

  // Local VPN Firewall State
  const [firewallState, setFirewallState] = useState<FirewallState>(() => {
    let savedSnapshotIds: string[] | null = null;
    let savedSnapshotEnabled: boolean | null = null;
    try {
      const snapRaw = localStorage.getItem('fps_booster_firewall_snapshot_v1');
      if (snapRaw) {
        const snap = JSON.parse(snapRaw);
        savedSnapshotIds = snap.blockedIds || null;
        savedSnapshotEnabled = typeof snap.enabled === 'boolean' ? snap.enabled : null;
      }
    } catch {}
    return {
      enabled: false,
      hasVpnPermission: false,
      notificationPermissionGranted: true,
      isNativeAndroid: isNativeAndroidRuntime(),
      connectionState: 'READY',
      activeTransport: isNativeAndroidRuntime() ? 'CHECKING' : 'WEB_PREVIEW',
      reconnectCount: 0,
      lastFailureReason: '',
      conflictDetected: false,
      uptimeSec: 0,
      vpnLayer: 1,
      firewallLayer: 1,
      layerStatusNote: 'Dual-Stack Guard Ready',
      dnsFilterEnabled: true,
      blockAllNonSelected: true,
      preset: 'custom',
      protectedGamePkg: 'com.tencent.ig',
      protectedGameName: 'PUBG Mobile',
      blockedBytesTotal: 0,
      blockedPacketsCount: 0,
      blockedTcpPackets: 0,
      blockedUdpPackets: 0,
      blockedDnsQueries: 0,
      blockedIpv4Packets: 0,
      blockedIpv6Packets: 0,
      persistentServiceRunning: false,
      wakeLockActive: false,
      heartbeatCount: 0,
      lastHeartbeatAt: 0,
      hasPreviousSnapshot: Boolean(savedSnapshotIds),
      previousSnapshotBlockedIds: savedSnapshotIds,
      previousSnapshotEnabled: savedSnapshotEnabled,
    };
  });

  const [selectedSuperBoostGamePkg, setSelectedSuperBoostGamePkg] = useState<string>(
    INITIAL_GAMES[0]?.packageName || 'com.tencent.ig'
  );

  const [superBoost, setSuperBoost] = useState<SuperBoostProgressState>({
    status: 'idle',
    currentStepIndex: 0,
    currentStepLabel: 'Ready to optimize',
    completedSteps: [],
    startedAt: null,
    selectedGamePackage: INITIAL_GAMES[0]?.packageName || 'com.tencent.ig',
    selectedGameName: INITIAL_GAMES[0]?.name || 'PUBG Mobile',
    errorMessage: null,
  });

  const [isBoostDetailsOpen, setIsBoostDetailsOpen] = useState<boolean>(false);
  const [boostDetailsSummary, setBoostDetailsSummary] = useState<BoostSessionSummary | null>(null);
  const [permissionFlow, setPermissionFlow] = useState<{
    isOpen: boolean;
    currentStep: PermissionFlowStep | null;
    stepsQueue: PermissionFlowStep[];
    checklist: PermissionChecklistState;
    isRequesting: boolean;
    pendingGame: GameItem | null;
  }>(() => {
    let onboarded = false;
    try {
      onboarded = localStorage.getItem('fps_booster_perms_onboarded_v1') === '1';
    } catch {}
    return {
      isOpen: false,
      currentStep: null,
      stepsQueue: [],
      checklist: {
        batteryOptimizationIgnored: onboarded,
        usageAccessGranted: onboarded,
        dndAccessGranted: onboarded,
        notificationGranted: true,
        vpnGranted: false,
        onboarded,
      },
      isRequesting: false,
      pendingGame: null,
    };
  });

  const masterBoostActive =
    superBoost.status === 'active' || (state.isBoosting && state.isGamingModeOn);

  const [recoveryHistory, setRecoveryHistory] = useState<RecoveryLogItem[]>([
    {
      id: 'rec_init',
      timestamp: Date.now(),
      category: 'session',
      severity: 'info',
      message: 'Super Boost Watchdog initialized (auto-recovery ready)',
    },
  ]);

  const addRecoveryLog = useCallback(
    (
      category: RecoveryLogItem['category'],
      severity: RecoveryLogItem['severity'],
      message: string
    ) => {
      setRecoveryHistory((prev) => {
        if (prev[0] && prev[0].message === message && Date.now() - prev[0].timestamp < 3000) {
          return prev;
        }
        return [
          {
            id: `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            category,
            severity,
            message,
          },
          ...prev.slice(0, 19),
        ];
      });
    },
    []
  );

  // Network Speed & Stability Diagnostics
  const [networkDiagnostics, setNetworkDiagnostics] = useState<NetworkDiagnosticsState>({
    pingMs: 0,
    jitterMs: 0,
    packetLossPercent: 0.0,
    downloadMbps: 0,
    uploadMbps: 0,
    stabilityPercent: 100,
    connectionType: 'CHECKING',
    isMeasuringSpeed: false,
    lastDiagnosticsAt: null,
    stabilityStatus: 'good',
    stabilityReason: 'Measuring real connection stability...',
    vpnOverheadDetected: false,
    routingMode: 'DIRECT_PHYSICAL',
    targetAchievable20to40: false,
    wifiBand: null,
    autoOptimizeEnabled: true,
    lastOptimizedAt: null,
    lastOptimizationAction: null,
    isRouteLocked: false,
    fastDnsServer: '1.1.1.1 / 1.0.0.1',
  });

  // 8-Step Smart Gaming Session State
  const [smartSession, setSmartSession] = useState<SmartSessionState>({
    isActive: false,
    startedAt: null,
    gameName: 'PUBG Mobile',
    gamePackage: 'com.tencent.ig',
    profileUsed: state.activeProfile || 'SMART_BOOST',
    completedSteps: [],
    peakTempC: state.temperatureC,
    fpsSamples: [],
  });

  const [performanceReports, setPerformanceReports] = useState<PerformanceReportItem[]>([]);
  const [crashDiagnostics, setCrashDiagnostics] = useState<CrashDiagnosticItem[]>([]);

  // Device Temperature Monitor State
  const [thermalMonitor, setThermalMonitor] = useState<ThermalMonitorState>(() => ({
    currentTempC: state.temperatureC || 34.2,
    batteryTempC: state.temperatureC || 34.2,
    cpuTempC: null,
    skinTempC: null,
    peakSessionTempC: state.temperatureC || 34.2,
    severity: 'normal',
    trend: 'stable',
    deltaPerMin: 0,
    thermalStatus: 'UNAVAILABLE',
    thermalHeadroom: null,
    cpuPressureState: null,
    sensorSource: isNativeAndroidRuntime() ? 'Android Thermal HAL + Battery' : 'Browser Hardware Telemetry',
    zones: [],
    history: [
      {
        timestamp: Date.now(),
        tempC: state.temperatureC || 34.2,
        severity: 'normal',
      },
    ],
    isHighTempWarning: false,
    warningMessage: null,
    warningDismissedAt: null,
    alertThresholdC: state.thermalAlertThresholdC ?? 41,
    autoCoolEnabled: state.autoCoolOnHighTemp ?? false,
    lastUpdatedAt: Date.now(),
  }));

  // FIREBASE INITIALIZATION & REAL-TIME FIRESTORE LISTENERS (Auth-gated)
  useEffect(() => {
    let unsubPayments: (() => void) | undefined;
    let unsubUser: (() => void) | undefined;

    const attachAuthenticatedListeners = (activeUid: string) => {
      if (unsubUser) unsubUser();
      if (unsubPayments) unsubPayments();

      syncUserToFirestore({
        userId: activeUid,
        name: auth.currentUser?.displayName || 'Gamer',
        isPro: false,
        proExpiry: null,
        activeFps: mapFpsForFirestore(state.activeFps, state.maxHardwareHz),
        activeProfile: state.activeProfile,
      });

      const userRef = doc(db, 'users', activeUid);
      unsubUser = onSnapshot(userRef, () => {
        // 100% Free Ad-Supported Edition
      }, (err) => {
        console.warn('Firestore user onSnapshot:', err);
      });

      const paymentsQuery = query(collection(db, 'payments'), where('userId', '==', activeUid));
      unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
        const liveList: TransactionProof[] = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          if (['jazzcash', 'easypaisa', 'binance'].includes(d.method)) {
            liveList.push({
              id: d.id || docSnap.id,
              userId: d.userId,
              packageId: d.packageId || 'free_ad_boost',
              packageName: d.packageName || 'Ad Boost Session',
              amount: d.amount || 0,
              method: d.method as PaymentMethodType,
              tid: d.tid,
              senderName: d.name || d.senderName || 'Gamer',
              phone: d.phone || '03193191407',
              screenshotUrl: d.screenshotUrl,
              screenshotName: d.screenshotName,
              ocrTid: d.ocrTid,
              matchStatus: d.matchStatus,
              note: d.note,
              status: d.status || 'pending',
              submittedAt: d.createdAt || Date.now(),
              reviewedAt: d.reviewedAt,
            });
          }
        });

        if (liveList.length > 0) {
          liveList.sort((a, b) => b.submittedAt - a.submittedAt);
          setTransactions(liveList);
        }
      }, (err) => {
        console.warn('Firestore payments onSnapshot:', err);
      });
    };

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setUserId(fbUser.uid);
        localStorage.setItem('fps_booster_user_uid', fbUser.uid);
        attachAuthenticatedListeners(fbUser.uid);
      } else {
        if (unsubUser) {
          unsubUser();
          unsubUser = undefined;
        }
        if (unsubPayments) {
          unsubPayments();
          unsubPayments = undefined;
        }
      }
    });

    ensureAnonymousAuth().catch(() => {});

    return () => {
      unsubAuth();
      if (unsubPayments) unsubPayments();
      if (unsubUser) unsubUser();
    };
  }, []);

  // Unified Real-Time Ping Monitor & Optimization State
  const [serverRegions, setServerRegions] = useState<ServerRegionPing[]>(INITIAL_SERVER_REGIONS);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('direct-anycast');
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [lastProbedTime, setLastProbedTime] = useState<string>('Probing...');

  const isProbingRef = useRef(false);
  const selectedRegionIdRef = useRef(selectedRegionId);
  selectedRegionIdRef.current = selectedRegionId;
  const serverRegionsRef = useRef(serverRegions);
  serverRegionsRef.current = serverRegions;
  const networkDiagnosticsRef = useRef(networkDiagnostics);
  networkDiagnosticsRef.current = networkDiagnostics;
  const lastAutoOptimizeMsRef = useRef<number>(0);
  const lastLowNoiseLogMsRef = useRef<number>(0);

  const runPingProbeInternal = useCallback(
    async (
      onlyActiveRegion: boolean = false
    ): Promise<{ measured: ServerRegionPing[]; best: ServerRegionPing | null; externalVpn: boolean }> => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setState((prev) => ({ ...prev, isOnline: false, pingMs: 0 }));
        setNetworkDiagnostics((prev) => ({
          ...prev,
          pingMs: 0,
          packetLossPercent: 100,
          stabilityPercent: 0,
          connectionType: 'OFFLINE',
          stabilityStatus: 'offline',
          stabilityReason: 'Device offline',
          targetAchievable20to40: false,
        }));
        setLastProbedTime('Offline');
        return { measured: [], best: null, externalVpn: false };
      }

      const targetList = onlyActiveRegion
        ? INITIAL_SERVER_REGIONS.filter((r) => r.id === selectedRegionIdRef.current)
        : INITIAL_SERVER_REGIONS;

      let externalVpnDetected = false;
      let measuredList: ServerRegionPing[] = [];

      if (isNativeAndroidRuntime()) {
        const nativeRes = await probeNativeNetworkLatency(targetList.map((r) => r.host));
        if (nativeRes && nativeRes.results.length > 0) {
          externalVpnDetected = Boolean(nativeRes.externalVpnDetected);
          measuredList = targetList.map((region) => {
            const match = nativeRes.results.find((item) => item.host === region.host);
            const reachable = Boolean(match && match.reachable && match.pingMs > 0);
            const pingMs = reachable && match ? match.pingMs : 0;
            const jitter = match ? match.jitterMs : 0;
            const loss = match ? match.packetLossPercent : 100;
            const status: ServerRegionPing['status'] = !reachable
              ? 'moderate'
              : pingMs <= 40
              ? 'optimal'
              : pingMs <= 75
              ? 'good'
              : 'moderate';
            return {
              ...region,
              currentPingMs: pingMs,
              jitterMs: jitter,
              packetLossPercent: loss,
              reachable,
              status,
            };
          });
        }
      }

      if (measuredList.length === 0) {
        measuredList = await Promise.all(
          targetList.map(async (region): Promise<ServerRegionPing> => {
            const rtt = await measureWarmEndpointRtt(region.url, 1450);
            const status: ServerRegionPing['status'] = !rtt.reachable
              ? 'moderate'
              : rtt.pingMs <= 40
              ? 'optimal'
              : rtt.pingMs <= 75
              ? 'good'
              : 'moderate';
            return {
              ...region,
              currentPingMs: rtt.reachable ? rtt.pingMs : 0,
              jitterMs: rtt.jitterMs,
              packetLossPercent: rtt.packetLossPercent,
              reachable: rtt.reachable,
              status,
            };
          })
        );
      }

      const reachableList = measuredList.filter((r) => r.reachable !== false && r.currentPingMs > 0);
      const bestReachable =
        reachableList.length > 0
          ? reachableList.reduce(
              (min, r) => (r.currentPingMs < min.currentPingMs ? r : min),
              reachableList[0]
            )
          : null;

      if (onlyActiveRegion && measuredList.length === 1) {
        const updatedSingle = measuredList[0];
        setServerRegions((prev) =>
          prev.map((r) => (r.id === updatedSingle.id ? updatedSingle : r))
        );
        if (updatedSingle.reachable !== false && updatedSingle.currentPingMs > 0) {
          setState((prev) => ({
            ...prev,
            isOnline: true,
            pingMs: updatedSingle.currentPingMs,
          }));
        }
      } else {
        setServerRegions(measuredList);
        if (bestReachable) {
          setSelectedRegionId(bestReachable.id);
          setState((prev) => ({
            ...prev,
            isOnline: true,
            pingMs: bestReachable.currentPingMs,
          }));
        }
      }

      const activeSnapshot =
        onlyActiveRegion && measuredList[0]
          ? measuredList[0]
          : bestReachable || measuredList[0];

      if (activeSnapshot) {
        setNetworkDiagnostics((prev) => {
          const effectivePing =
            activeSnapshot.currentPingMs > 0 ? activeSnapshot.currentPingMs : prev.pingMs;
          const stability = classifyConnectionStability({
            isOnline: typeof navigator === 'undefined' || navigator.onLine !== false,
            pingMs: effectivePing,
            jitterMs: activeSnapshot.jitterMs,
            packetLossPercent: activeSnapshot.packetLossPercent,
            connectionType: prev.connectionType || 'WEB',
            vpnOverheadDetected: externalVpnDetected || Boolean(prev.vpnOverheadDetected),
            localFirewallBypassActive: Boolean(firewallState.enabled && isNativeAndroidRuntime()),
            wifiRssiDbm: prev.wifiRssiDbm,
            wifiLinkMbps: prev.wifiLinkMbps,
            wifiBand: prev.wifiBand,
          });
          return {
            ...prev,
            pingMs: effectivePing,
            jitterMs: activeSnapshot.jitterMs,
            packetLossPercent: activeSnapshot.packetLossPercent,
            stabilityPercent: stability.stabilityPercent,
            stabilityStatus: stability.stabilityStatus,
            stabilityReason: stability.stabilityReason,
            routingMode: stability.routingMode,
            targetAchievable20to40: stability.targetAchievable20to40,
            vpnOverheadDetected: externalVpnDetected || prev.vpnOverheadDetected,
          };
        });
      }

      setLastProbedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      return { measured: measuredList, best: bestReachable, externalVpn: externalVpnDetected };
    },
    [firewallState.enabled]
  );

  const optimizeNetworkRoute = useCallback(
    async (reason: string = 'Manual Route Optimization') => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setSnackBarMessage('Device Offline — Reconnect Wi-Fi or Mobile Data');
        return;
      }

      const prevSelectedId = selectedRegionIdRef.current;
      const prevRegion =
        serverRegionsRef.current.find((r) => r.id === prevSelectedId) || serverRegionsRef.current[0];
      const beforePing = prevRegion?.currentPingMs || networkDiagnosticsRef.current.pingMs;

      // Suppress non-essential background cloud sync while optimizing network stability
      if (typeof window !== 'undefined') {
        (window as unknown as Record<string, unknown>)['__FPS_LOW_NETWORK_NOISE__'] = true;
      }

      // If Boost is active, re-sync native background app blocking & trim noisy background processes
      if (latestStateRef.current.isBoosting) {
        const curBlocked = filterSafeBlockedPackages(appsList, firewallState.protectedGamePkg);
        const curAllowed = filterAllowedPackages(appsList, firewallState.protectedGamePkg);
        trimNativeBackgroundMemory(curBlocked, firewallState.protectedGamePkg).catch(() => {});
        if (isNativeAndroidRuntime() && firewallState.enabled) {
          GamingFirewallNative.startFirewall({
            blockedPackages: curBlocked,
            allowedPackages: curAllowed,
            blockAllNonSelected: firewallState.blockAllNonSelected !== false,
            boostExpiresAtMs: latestStateRef.current.boostExpiresAtMs || undefined,
            protectedGamePackage: firewallState.protectedGamePkg,
            dnsFilter: firewallState.dnsFilterEnabled,
          }).catch(() => {});
        }
      }

      const { best, externalVpn } = await runPingProbeInternal(false);
      const afterPing = best?.currentPingMs || beforePing;
      const bestName = best?.name || prevRegion?.name || 'Direct Edge';
      const curDiag = networkDiagnosticsRef.current;

      let actionText = '';
      if (externalVpn) {
        actionText = `External VPN adds hop latency (${afterPing}ms) — disconnect external VPN for direct routing`;
        addRecoveryLog('network', 'warning', actionText);
      } else if (curDiag.stabilityStatus === 'unstable_wifi' || curDiag.stabilityStatus === 'unstable_mobile' || curDiag.packetLossPercent > 0) {
        actionText = `Network unstable (${afterPing}ms, ${curDiag.packetLossPercent}% loss) — switch Wi-Fi ↔ Cellular if drops continue`;
        addRecoveryLog('network', 'warning', actionText);
        if (reason !== 'Ping > 40ms Guard') {
          setSnackBarMessage('Unstable network detected — consider switching Wi-Fi ↔ Cellular');
        }
      } else if (best && best.id !== prevSelectedId && beforePing > 0 && afterPing < beforePing) {
        actionText = `Switched to fastest direct route ${bestName}: ${beforePing}ms → ${afterPing}ms (0ms VPN hop)`;
        addRecoveryLog('network', 'info', actionText);
      } else if (afterPing > 0 && afterPing <= 40) {
        actionText = `20–40ms target achieved (${afterPing}ms) on direct route ${bestName} · DNS 1.1.1.1`;
        addRecoveryLog('network', 'info', actionText);
      } else {
        actionText = `Verified direct route ${bestName} (${afterPing}ms actual ISP latency) · BG noise blocked`;
        if (Date.now() - lastLowNoiseLogMsRef.current > 30_000) {
          lastLowNoiseLogMsRef.current = Date.now();
          addRecoveryLog('network', 'info', actionText);
        }
      }

      setNetworkDiagnostics((prev) => ({
        ...prev,
        lastOptimizedAt: Date.now(),
        lastOptimizationAction: actionText,
        fastDnsServer: '1.1.1.1 / 1.0.0.1',
      }));
      addLog(`Net Optimizer (${reason}): ${actionText}`);
      if (reason === 'Manual Route Optimization' || reason === 'Manual Route Reset') {
        setSnackBarMessage(
          externalVpn
            ? 'External VPN Detected — Disable for Lower Ping'
            : curDiag.packetLossPercent > 0
            ? `Route Reset (${afterPing}ms) — Switch Wi-Fi ↔ Cellular if unstable`
            : `Route Verified: ${bestName} (${afterPing}ms)`
        );
      }
    },
    [addRecoveryLog, appsList, firewallState.enabled, firewallState.protectedGamePkg, runPingProbeInternal]
  );

  const resetNetworkInterfaceAndRoute = useCallback(async () => {
    await optimizeNetworkRoute('Manual Route Reset');
  }, [optimizeNetworkRoute]);

  const runPingProbe = useCallback(
    async (onlyActiveRegion: boolean = false) => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (isProbingRef.current) return;

      isProbingRef.current = true;
      setIsProbing(true);
      try {
        const res = await runPingProbeInternal(onlyActiveRegion);
        const curDiag = networkDiagnosticsRef.current;
        const activeSnap =
          onlyActiveRegion && res.measured[0]
            ? res.measured[0]
            : res.best || res.measured[0];

        // Automatic network optimization every time ping crosses 40ms threshold or packet loss/jitter spikes
        const isBoostedNow = Boolean(latestStateRef.current.isBoosting || latestStateRef.current.isGamingModeOn);
        const thresholdMs = isBoostedNow ? 40 : 48;
        const shouldAutoOptimize =
          curDiag.autoOptimizeEnabled !== false &&
          onlyActiveRegion &&
          activeSnap &&
          ((activeSnap.currentPingMs > thresholdMs && activeSnap.reachable !== false) ||
            activeSnap.jitterMs >= 15 ||
            activeSnap.packetLossPercent > 0 ||
            res.externalVpn);

        if (shouldAutoOptimize && Date.now() - lastAutoOptimizeMsRef.current >= 12_000) {
          lastAutoOptimizeMsRef.current = Date.now();
          await optimizeNetworkRoute(isBoostedNow ? 'Ping > 40ms Guard' : 'Auto Spike Guard');
        }
      } finally {
        isProbingRef.current = false;
        setIsProbing(false);
      }
    },
    [optimizeNetworkRoute, runPingProbeInternal]
  );

  const toggleAutoOptimizeNetwork = () => {
    haptics.selection();
    sound.playClick();
    setNetworkDiagnostics((prev) => {
      const next = prev.autoOptimizeEnabled === false;
      setSnackBarMessage(
        next ? 'Auto Network Optimizer Enabled' : 'Auto Network Optimizer Paused'
      );
      return { ...prev, autoOptimizeEnabled: next };
    });
  };

  const selectPingRegion = (regionId: string) => {
    const found = serverRegions.find(r => r.id === regionId);
    if (!found) return;
    setSelectedRegionId(found.id);
    if (found.currentPingMs > 0) {
      setState(prev => ({
        ...prev,
        pingMs: found.currentPingMs,
      }));
    }
  };

  useEffect(() => {
    runPingProbe(false);
    // Strict 2-second live ping monitoring during active Boost session
    const pingCadenceMs = state.batterySaverMode
      ? 60000
      : state.isBoosting || state.isGamingModeOn
      ? 2000
      : 18000;
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        runPingProbe(true);
      }
    }, pingCadenceMs);

    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      runPingProbe(false);
    };
    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false, pingMs: 0 }));
      setLastProbedTime('Offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [runPingProbe, state.batterySaverMode, state.isBoosting, state.isGamingModeOn]);

  const activeRegion = serverRegions.find(r => r.id === selectedRegionId) || serverRegions[0];

  // Sync audio mute & Capacitor haptics state cleanly
  useEffect(() => {
    sound.setMuted(!state.soundAndHaptics);
    haptics.setEnabled(Boolean(state.soundAndHaptics));
  }, [state.soundAndHaptics]);

  // Sync Battery Saver background throttle flag & native screen brightness
  useEffect(() => {
    const enabled = Boolean(state.batterySaverMode);
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>)['__FPS_BATTERY_SAVER__'] = enabled;
    }
    applyNativeScreenBrightness(enabled, 0.3).catch(() => {});
  }, [state.batterySaverMode]);

  // Throttle 1-second timer tick writes, but flush immediately whenever Boost or Expiration changes
  const lastStatePersistMsRef = useRef<number>(0);
  const lastCriticalPersistKeyRef = useRef<string>('');
  const latestPersistStateRef = useRef(state);
  latestPersistStateRef.current = state;

  useEffect(() => {
    const now = Date.now();
    const criticalKey = `${state.isBoosting ? 1 : 0}_${state.boostExpiresAtMs || 0}_${state.activeFps}_${state.activeProfile}`;
    const criticalChanged = criticalKey !== lastCriticalPersistKeyRef.current;
    if (criticalChanged || now - lastStatePersistMsRef.current >= 10_000 || !state.isBoosting) {
      lastStatePersistMsRef.current = now;
      lastCriticalPersistKeyRef.current = criticalKey;
      try {
        localStorage.setItem('fps_booster_state_v4', JSON.stringify(state));
      } catch {}
    }
  }, [state]);

  useEffect(() => {
    const flushState = () => {
      try {
        localStorage.setItem('fps_booster_state_v4', JSON.stringify(latestPersistStateRef.current));
      } catch {}
    };
    window.addEventListener('pagehide', flushState);
    return () => {
      flushState();
      window.removeEventListener('pagehide', flushState);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('fps_booster_per_game_profiles_v1', JSON.stringify(perGameProfiles));
  }, [perGameProfiles]);

  useEffect(() => {
    localStorage.setItem('fps_booster_apps_v6', JSON.stringify(appsList));
  }, [appsList]);

  useEffect(() => {
    localStorage.setItem('fps_booster_auto_approve', JSON.stringify(autoApproveEnabled));
  }, [autoApproveEnabled]);

  // Hardware display refresh rate & DisplayMetrics detection
  useEffect(() => {
    const unsub = RefreshRateDetector.addDisplayListener((info) => {
      setDisplayInfo(info);
      setState(prev => ({
        ...prev,
        maxHardwareHz: info.maxHz,
      }));
      setDeviceCapabilities(prev => ({
        ...prev,
        maxRefreshHz: info.maxHz,
        activeRefreshHz: info.activeHz,
        supportedRefreshRates: info.supportedRates,
        widthPx: info.widthPx,
        heightPx: info.heightPx,
        densityDpi: info.densityDpi,
      }));
    });
    RefreshRateDetector.detectHardwareHz();
    return unsub;
  }, []);

  const redetectRefreshRate = useCallback(async (): Promise<DisplayHardwareInfo> => {
    const info = await RefreshRateDetector.detectHardwareHz(true);
    setDisplayInfo(info);
    setState(prev => ({
      ...prev,
      maxHardwareHz: info.maxHz,
    }));
    const caps = await queryDeviceCapabilities(info.maxHz);
    setDeviceCapabilities({
      ...caps,
      maxRefreshHz: info.maxHz,
      activeRefreshHz: info.activeHz,
      supportedRefreshRates: info.supportedRates,
      widthPx: info.widthPx,
      heightPx: info.heightPx,
      densityDpi: info.densityDpi,
    });
    addLog(
      `Display probed (${info.detectionSource}): ${info.maxHz}Hz max, ${info.widthPx}x${info.heightPx} @ ${info.densityDpi}dpi`
    );
    return info;
  }, []);

  // Listen to Real Hardware Stats from RealStatsPlugin / app.js
  useEffect(() => {
    updateRealStats();
    const handleRealStats = (e: any) => {
      const data = e.detail;
      if (!data) return;
      setState(prev => {
        const nextRamUsed = data.ramUsed !== undefined ? parseFloat(data.ramUsed) : (data.ram?.used ? parseFloat(data.ram.used) : prev.ramUsedGb);
        const nextRamTotal = data.ramTotal !== undefined ? parseFloat(data.ramTotal) : (data.ram?.total ? parseFloat(data.ram.total) : prev.totalRamGb);
        const nextRamPercent = data.ramPercent !== undefined ? Number(data.ramPercent) : (data.ram?.percent !== undefined ? Number(data.ram.percent) : prev.ramUsagePercent);
        const nextTemp = data.temp !== undefined ? parseFloat(data.temp) : (data.temp?.temp ? parseFloat(data.temp.temp) : prev.temperatureC);
        const nextBattery = data.battery !== undefined ? Number(data.battery) : (data.temp?.battery !== undefined ? Number(data.temp.battery) : (prev.batteryLevel ?? 85));
        const nextFps = data.fps !== undefined ? Number(data.fps) : prev.currentFps;
        const nativeMaxHz = data.isNativeDisplay && data.maxRefreshRate !== undefined ? Math.round(Number(data.maxRefreshRate)) : null;
        const nextStorageFree = data.storageFreeGb !== undefined ? parseFloat(data.storageFreeGb) : prev.storage?.freeGb;
        const nextStorageTotal = data.storageTotalGb !== undefined ? parseFloat(data.storageTotalGb) : prev.storage?.totalGb;
        const nextStoragePct = data.storageUsedPercent !== undefined ? Number(data.storageUsedPercent) : prev.storage?.usedPercent;
        const nextCacheKb = data.appTempCacheKb !== undefined ? Number(data.appTempCacheKb) : prev.storage?.appTempCacheKb;

        return {
          ...prev,
          ramUsedGb: isNaN(nextRamUsed) ? prev.ramUsedGb : nextRamUsed,
          totalRamGb: isNaN(nextRamTotal) ? prev.totalRamGb : nextRamTotal,
          ramUsagePercent: isNaN(nextRamPercent) ? prev.ramUsagePercent : nextRamPercent,
          temperatureC: isNaN(nextTemp) ? prev.temperatureC : nextTemp,
          batteryLevel: isNaN(nextBattery) ? prev.batteryLevel : nextBattery,
          isBatteryCharging: typeof data.isCharging === 'boolean' ? data.isCharging : prev.isBatteryCharging,
          currentFps: isNaN(nextFps) ? prev.currentFps : nextFps,
          maxHardwareHz:
            nativeMaxHz && !isNaN(nativeMaxHz) && nativeMaxHz >= 30
              ? nativeMaxHz
              : prev.maxHardwareHz,
          storage: {
            freeGb: nextStorageFree !== undefined && !isNaN(nextStorageFree) ? nextStorageFree : (prev.storage?.freeGb ?? 28.4),
            totalGb: nextStorageTotal !== undefined && !isNaN(nextStorageTotal) ? nextStorageTotal : (prev.storage?.totalGb ?? 64.0),
            usedPercent: nextStoragePct !== undefined && !isNaN(nextStoragePct) ? nextStoragePct : (prev.storage?.usedPercent ?? 56),
            appTempCacheKb: nextCacheKb !== undefined && !isNaN(nextCacheKb) ? nextCacheKb : (prev.storage?.appTempCacheKb ?? 0),
            isNativeStorage: typeof data.isNativeStorage === 'boolean' ? data.isNativeStorage : (prev.storage?.isNativeStorage ?? false),
          },
        };
      });

      if (data.isNativeDisplay && data.maxRefreshRate) {
        const nativeActive = Math.round(Number(data.fps || data.maxRefreshRate));
        const nativeMax = Math.max(nativeActive, Math.round(Number(data.maxRefreshRate)));
        const nativeRates =
          Array.isArray(data.supportedRefreshRates) && data.supportedRefreshRates.length > 0
            ? data.supportedRefreshRates.map((r: unknown) => Math.round(Number(r))).filter((r: number) => r >= 30)
            : [nativeMax];
        setDisplayInfo(prev => ({
          ...prev,
          activeHz: nativeActive,
          maxHz: nativeMax,
          supportedRates: nativeRates,
          widthPx: Number(data.widthPixels) > 0 ? Number(data.widthPixels) : prev.widthPx,
          heightPx: Number(data.heightPixels) > 0 ? Number(data.heightPixels) : prev.heightPx,
          densityDpi: Number(data.densityDpi) > 0 ? Number(data.densityDpi) : prev.densityDpi,
          detectionSource: String(data.detectionSource || 'Android WindowManager & DisplayMetrics'),
          isNativeAndroid: true,
          isDetecting: false,
          detectedAt: Date.now(),
        }));
      }
    };

    window.addEventListener('fpsbooster_realstats', handleRealStats);

    const handleRewardGranted = (e: any) => {
      const data = e.detail;
      if (data && data.durationMinutes) {
        setBoostDurationPreset(data.durationMinutes, data.targetFps || '120', data.label || 'Boost Timer');
      }
    };

    const handleToast = (e: any) => {
      if (e.detail?.message) {
        setSnackBarMessage(e.detail.message);
      }
    };

    window.addEventListener('fpsbooster_reward_granted', handleRewardGranted);
    window.addEventListener('fpsbooster_toast', handleToast);

    return () => {
      window.removeEventListener('fpsbooster_realstats', handleRealStats);
      window.removeEventListener('fpsbooster_reward_granted', handleRewardGranted);
      window.removeEventListener('fpsbooster_toast', handleToast);
    };
  }, []);

  // Battery-friendly visibility-aware real frame pacing measurement (8 frames burst, dynamic cadence)
  useEffect(() => {
    let rafId: number | null = null;
    const measureFramePacingBurst = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      let count = 0;
      let lastTs = performance.now();
      const deltas: number[] = [];

      const step = (now: number) => {
        if (typeof document !== 'undefined' && document.hidden) return;
        const delta = now - lastTs;
        lastTs = now;
        if (count > 1 && delta > 3 && delta < 50) {
          deltas.push(delta);
        }
        count++;
        if (count < 9) {
          rafId = requestAnimationFrame(step);
        } else if (deltas.length >= 4) {
          const avgDelta = deltas.reduce((s, d) => s + d, 0) / deltas.length;
          const measuredFps = Math.round(1000 / avgDelta);
          setState(prev => {
            const targetCap = prev.isBoosting
              ? Math.min(resolveNumericFps(prev.activeFps, prev.maxHardwareHz), prev.maxHardwareHz || 120)
              : (prev.maxHardwareHz || 60);
            const honestFps = Math.max(20, Math.min(targetCap, measuredFps));
            if (honestFps === prev.currentFps) return prev;
            return { ...prev, currentFps: honestFps };
          });
        }
      };

      rafId = requestAnimationFrame(step);
    };

    const cadenceMs = state.batterySaverMode
      ? 8000
      : currentScreen === 'dashboard' || state.isBoosting || state.isGamingModeOn
      ? 2000
      : 4000;
    const iv = setInterval(measureFramePacingBurst, cadenceMs);
    return () => {
      clearInterval(iv);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [currentScreen, state.isBoosting, state.isGamingModeOn, state.batterySaverMode]);

  const boostTransitionLockRef = useRef<boolean>(false);
  const stopSuperBoostRef = useRef<() => Promise<void>>(async () => {});
  const executeAtomicBoostStartRef = useRef<(explicitGame?: GameItem, bypassTimeCheck?: boolean) => Promise<void>>(async () => {});
  const adRewardLockRef = useRef<number>(0);

  // Boot Cleanup: If countdown expired while Android WebView was closed, ensure lingering native VPN/DND stops
  useEffect(() => {
    if (!isNativeAndroidRuntime()) return;
    const expiresAt = latestStateRef.current.boostExpiresAtMs;
    if (!expiresAt || expiresAt <= Date.now()) {
      GamingFirewallNative.getFirewallStatus()
        .then((st) => {
          if (st.isVpnRunning || st.persistentServiceRunning) {
            GamingFirewallNative.stopFirewall().catch(() => {});
            setNativeDndMode(false).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, []);

  // Expiration-based Boost Countdown: derives remaining seconds from boostExpiresAtMs - Date.now(), auto-stops at 00:00
  useEffect(() => {
    const expiresAt = state.boostExpiresAtMs ?? null;
    if (!expiresAt) {
      if (state.isBoosting || state.boostTimeRemainingSec > 0) {
        setState(prev => ({
          ...prev,
          isBoosting: false,
          isGamingModeOn: false,
          isVpnActive: false,
          boostTimeRemainingSec: 0,
          activeSessionStartedAtMs: null,
        }));
      }
      return;
    }

    const syncRemaining = () => {
      const rem = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      if (rem <= 0) {
        setState(prev => ({
          ...prev,
          boostExpiresAtMs: null,
          activeSessionStartedAtMs: null,
          boostTimeRemainingSec: 0,
        }));
        stopSuperBoostRef.current().catch(() => {});
        setSnackBarMessage('Boost Time Expired — Watch an Ad to Boost again!');
        return;
      }
      setState(prev => {
        if (prev.boostTimeRemainingSec === rem) return prev;
        return {
          ...prev,
          boostTimeRemainingSec: rem,
        };
      });
    };

    syncRemaining();
    const interval = setInterval(syncRemaining, 1000);
    const onFocusOrVisible = () => {
      if (typeof document === 'undefined' || !document.hidden) {
        syncRemaining();
      }
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [state.boostExpiresAtMs]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev.slice(0, 15)]);
  };

  // Native Android PackageManager Sync + Global Catalog Merge
  const refreshInstalledPackages = useCallback(async () => {
    setIsRefreshingPackages(true);
    try {
      if (isNativeAndroidRuntime()) {
        const [nativeApps, nativeGames] = await Promise.all([
          fetchNativeInstalledApps(),
          fetchNativeInstalledGames(),
        ]);

        if (nativeApps.length > 0) {
          setAppsList(prevApps => {
            const prevBlockedMap = new Map(prevApps.map(a => [a.packageName, a.isBlocked]));
            const mergedApps: AppBlockItem[] = nativeApps.map(na => ({
              ...na,
              isBlocked: prevBlockedMap.has(na.packageName) ? Boolean(prevBlockedMap.get(na.packageName)) : na.isBlocked,
            }));
            return mergedApps;
          });
          setCatalogSource('android_packagemanager');
        }

        const nativePkgMap = new Map(nativeGames.map(g => [g.packageName, g]));
        const installedList: GameItem[] = nativeGames.map(g => ({ ...g, isInstalled: true, source: 'android_installed' }));
        const catalogComplement: GameItem[] = INITIAL_GAMES.filter(cg => !nativePkgMap.has(cg.packageName)).map(cg => ({
          ...cg,
          isInstalled: false,
          source: 'catalog',
        }));
        setGamesList(deduplicateGames([...installedList, ...catalogComplement]));
        if (nativeGames.length > 0) {
          setSelectedSuperBoostGamePkg(prev =>
            nativePkgMap.has(prev) ? prev : nativeGames[0].packageName
          );
        }
        addLog(`PackageManager scan complete: ${nativeApps.length} apps, ${nativeGames.length} games detected`);
      } else {
        setCatalogSource('catalog');
        setGamesList(INITIAL_GAMES.map(g => ({ ...g, isInstalled: false, source: 'catalog' })));
      }
    } finally {
      setIsRefreshingPackages(false);
    }
  }, []);

  useEffect(() => {
    refreshInstalledPackages();
  }, [refreshInstalledPackages]);

  const toggleFavoriteGame = (packageName: string) => {
    haptics.selection();
    sound.playClick();
    setFavoriteGamePackages(prev => {
      const exists = prev.includes(packageName);
      const next = exists ? prev.filter(p => p !== packageName) : [packageName, ...prev];
      try {
        localStorage.setItem('fps_booster_favorite_games_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const markGamePlayed = (packageName: string) => {
    setRecentGamePackages(prev => {
      const next = [packageName, ...prev.filter(p => p !== packageName)].slice(0, 12);
      try {
        localStorage.setItem('fps_booster_recent_games_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
    setGamesList(prev =>
      prev.map(g => (g.packageName === packageName ? { ...g, lastPlayedAt: Date.now() } : g))
    );
  };

  // Rewarded Ad Completion Handler: sets expiration timestamp AND immediately starts Boost ON
  const grantAdBoostTime = (durationMinutes: number, adsWatched: number = 1, label?: string) => {
    const now = Date.now();
    if (now - adRewardLockRef.current < 3000) return;
    adRewardLockRef.current = now;

    haptics.success();
    sound.playReward();
    const addedSec = Math.max(60, Math.round(durationMinutes * 60));
    const nextExpiresAt = now + addedSec * 1000;
    const fps = durationMinutes >= 120 ? '120' : durationMinutes >= 60 ? '90' : '60';

    setState(prev => {
      const nextState: BoosterState = {
        ...prev,
        selectedBoostMinutes: durationMinutes,
        activeFps: prev.isBoosting ? prev.activeFps : fps,
        boostExpiresAtMs: nextExpiresAt,
        activeSessionStartedAtMs: now,
        boostTimeRemainingSec: addedSec,
        boostDurationTotalSec: addedSec,
        totalAdsWatched: (prev.totalAdsWatched || 0) + adsWatched,
      };
      latestStateRef.current = nextState;
      return nextState;
    });

    const displayLabel = label || `+${durationMinutes} Min Boost`;
    setSnackBarMessage(`Unlocked ${displayLabel}! Starting Boost ON...`);
    addLog(`Rewarded Ad (${adsWatched} ad): Boost countdown set to ${durationMinutes} Min — auto-starting Boost ON.`);

    setTimeout(() => {
      if (!latestStateRef.current.isBoosting) {
        executeAtomicBoostStartRef.current(undefined, true).catch(() => {});
      }
    }, 60);
  };

  // FPS Unlock Center Ad Reward Handler (60 / 90 / 120 FPS tiers)
  const unlockFpsWithAd = (tier: FpsTierKey) => {
    const now = Date.now();
    if (now - adRewardLockRef.current < 3000) return;
    adRewardLockRef.current = now;

    haptics.success();
    sound.playReward();
    const expiresAt = now + 24 * 60 * 60 * 1000;

    setState(prev => {
      const currentUnlocks = prev.fpsUnlocks || {
        '60': { ...DEFAULT_FPS_UNLOCKS['60'] },
        '90': { ...DEFAULT_FPS_UNLOCKS['90'] },
        '120': { ...DEFAULT_FPS_UNLOCKS['120'] },
      };
      const prevTier = currentUnlocks[tier] || DEFAULT_FPS_UNLOCKS[tier];
      return {
        ...prev,
        activeFps: tier,
        totalAdsWatched: (prev.totalAdsWatched || 0) + 1,
        fpsUnlocks: {
          ...currentUnlocks,
          [tier]: {
            unlocked: true,
            unlockedAtMs: now,
            expiresAtMs: expiresAt,
            adsWatched: (prevTier.adsWatched || 0) + 1,
          },
        },
      };
    });

    setSnackBarMessage(`${tier} FPS Mode Unlocked & Active (24h)!`);
    addLog(`FPS Unlock Center: Unlocked ${tier} FPS tier via Rewarded Ad.`);
  };

  const isFpsTierUnlocked = useCallback(
    (mode: FPSMode): boolean => {
      if (mode === '30' || mode === '45' || mode === 'higher') return true;
      const tier = state.fpsUnlocks?.[mode];
      if (!tier) return false;
      return Boolean(tier.unlocked && (!tier.expiresAtMs || tier.expiresAtMs > Date.now()));
    },
    [state.fpsUnlocks]
  );

  // Configures Boost duration preset without bypassing the Ad-Time Gate
  const setBoostDurationPreset = (durationMinutes: number, targetFps?: FPSMode, label?: string) => {
    haptics.impactLight();
    sound.playClick();
    const mode = targetFps || (durationMinutes >= 120 ? '120' : durationMinutes >= 60 ? '90' : '60');

    setState(prev => ({
      ...prev,
      selectedBoostMinutes: durationMinutes,
      activeFps: mode,
    }));

    const displayLabel = label || `${mode} FPS · ${durationMinutes} Min`;
    setSnackBarMessage(
      (state.boostTimeRemainingSec || 0) > 0
        ? `Target Selected: ${displayLabel} — Tap BOOST ON`
        : `Watch Ad to unlock ${durationMinutes} Min Boost`
    );
    addLog(`Boost Profile Selected: ${displayLabel}`);
  };

  // Cloud Backend Health + Remote Config + Compatibility Sync
  const syncCloudBackend = async () => {
    setCloudBackend(prev => ({ ...prev, status: 'checking' }));
    const conn = await measureFirestoreConnection();
    const detectedInfo = await RefreshRateDetector.detectHardwareHz();
    const caps = await queryDeviceCapabilities(detectedInfo.maxHz);
    setDeviceCapabilities({
      ...caps,
      maxRefreshHz: detectedInfo.maxHz,
      activeRefreshHz: detectedInfo.activeHz,
      supportedRefreshRates: detectedInfo.supportedRates,
      widthPx: detectedInfo.widthPx,
      heightPx: detectedInfo.heightPx,
      densityDpi: detectedInfo.densityDpi,
    });

    const [remoteCfg, remoteProfs, reports] = await Promise.all([
      fetchRemoteCloudConfig(),
      fetchRemoteOptimizationProfiles(),
      fetchUserPerformanceReports(userId),
    ]);

    const tier = await syncDeviceCompatibilityToFirestore(
      userId,
      caps,
      state.totalRamGb || 4.0,
      state.activeProfile
    );

    if (reports.length > 0) {
      setPerformanceReports(reports);
    }

    setCloudBackend(prev => ({
      status: conn.status,
      rttMs: conn.rttMs,
      lastSyncedAt: Date.now(),
      errorMessage: conn.errorMessage,
      remoteConfig: remoteCfg || prev.remoteConfig,
      remoteProfiles: remoteProfs.length > 0 ? remoteProfs : OPTIMIZATION_PROFILES,
      deviceTier: tier,
    }));
  };

  useEffect(() => {
    syncCloudBackend();
  }, [userId]);

  // Network Speed & Stability Diagnostics
  const runFullNetworkDiagnostics = async () => {
    setNetworkDiagnostics(prev => ({ ...prev, isMeasuringSpeed: true }));
    const region = serverRegions.find(r => r.id === selectedRegionId) || serverRegions[0];
    const diag = await runNetworkSpeedDiagnostics(region.url, region.currentPingMs, {
      nativeHost: region.host,
      localFirewallBypassActive: Boolean(firewallState.enabled && isNativeAndroidRuntime()),
      prevAutoOptimizeEnabled: networkDiagnosticsRef.current.autoOptimizeEnabled,
      prevLastOptimizedAt: networkDiagnosticsRef.current.lastOptimizedAt,
      prevLastOptimizationAction: networkDiagnosticsRef.current.lastOptimizationAction,
    });
    setNetworkDiagnostics(diag);
    if (diag.pingMs > 0) {
      setState(prev => ({ ...prev, pingMs: diag.pingMs }));
    }
    addLog(`Network Diagnostics: ${diag.pingMs}ms (${diag.stabilityStatus}), ${diag.downloadMbps}↓ / ${diag.uploadMbps}↑ Mbps, Stability ${diag.stabilityPercent}%`);
  };

  useEffect(() => {
    // Defer initial network speed diagnostic slightly so cold startup UI paints first
    const t = setTimeout(() => {
      runFullNetworkDiagnostics();
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  // Poll + listen to real-time Native Android VPN Firewall health & recovery broadcasts
  useEffect(() => {
    if (!isNativeAndroidRuntime()) return;

    const applyNativeStatus = (status: NativeVpnStatusPayload) => {
      setFirewallState(prev => ({
        ...prev,
        isNativeAndroid: true,
        hasVpnPermission: status.permissionGranted,
        notificationPermissionGranted: status.notificationPermissionGranted ?? prev.notificationPermissionGranted,
        enabled: status.isVpnRunning || Boolean(status.persistentServiceRunning),
        persistentServiceRunning: Boolean(status.persistentServiceRunning),
        wakeLockActive: Boolean(status.wakeLockActive),
        heartbeatCount: status.heartbeatCount ?? prev.heartbeatCount ?? 0,
        lastHeartbeatAt: status.lastHeartbeatAt ?? prev.lastHeartbeatAt ?? 0,
        connectionState: status.connectionState || (status.isVpnRunning ? 'CONNECTED' : 'READY'),
        activeTransport: status.activeTransport || prev.activeTransport,
        reconnectCount: status.reconnectCount ?? prev.reconnectCount,
        lastFailureReason: status.lastFailureReason ?? prev.lastFailureReason,
        conflictDetected: Boolean(status.conflictDetected),
        uptimeSec: status.uptimeSec ?? prev.uptimeSec,
        vpnLayer: status.vpnLayer ?? prev.vpnLayer ?? 1,
        firewallLayer: status.firewallLayer ?? prev.firewallLayer ?? 1,
        layerStatusNote: status.layerStatusNote ?? prev.layerStatusNote,
        dnsFilterEnabled: status.dnsFilterEnabled ?? prev.dnsFilterEnabled,
        blockedBytesTotal: status.blockedBytes || 0,
        blockedPacketsCount: status.blockedPackets || 0,
        blockedTcpPackets: status.blockedTcpPackets ?? prev.blockedTcpPackets,
        blockedUdpPackets: status.blockedUdpPackets ?? prev.blockedUdpPackets,
        blockedDnsQueries: status.blockedDnsQueries ?? prev.blockedDnsQueries,
        blockedIpv4Packets: status.blockedIpv4Packets ?? prev.blockedIpv4Packets,
        blockedIpv6Packets: status.blockedIpv6Packets ?? prev.blockedIpv6Packets,
      }));

      if (status.eventMessage && status.eventType !== 'heartbeat') {
        const sev =
          status.eventType === 'error'
            ? 'error'
            : status.eventType === 'reconnecting' || status.eventType === 'network_lost'
            ? 'warning'
            : 'info';
        addRecoveryLog('vpn', sev, status.eventMessage);
        addLog(`VPN: ${status.eventMessage}`);
      }

      if (
        (status.eventType === 'stopped' || status.eventType === 'expired') &&
        latestStateRef.current.isBoosting
      ) {
        stopSuperBoostRef.current().catch(() => {});
      }
    };

    const pollFirewall = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const status = await GamingFirewallNative.getFirewallStatus();
        applyNativeStatus(status);
      } catch {}
    };

    pollFirewall();
    const shouldPollOften =
      firewallState.enabled || state.isBoosting || currentScreen === 'dashboard' || currentScreen === 'block_apps';
    const firewallPollMs = state.isBoosting ? 2000 : state.batterySaverMode ? 14000 : 5500;
    const iv = shouldPollOften ? setInterval(pollFirewall, firewallPollMs) : null;
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    GamingFirewallNative.addListener('vpnStateChanged', (payload) => {
      applyNativeStatus(payload);
    })
      .then((h) => {
        listenerHandle = h;
      })
      .catch(() => {});

    return () => {
      if (iv) clearInterval(iv);
      if (listenerHandle) {
        listenerHandle.remove().catch(() => {});
      }
    };
  }, [addRecoveryLog, firewallState.enabled, state.isBoosting, state.batterySaverMode, currentScreen]);

  // 2-Second Active Boost Watchdog: continuously checks VPN layer, Firewall layer, blocking rules & ping route
  const lastWatchdogProbeMsRef = useRef<number>(0);
  useEffect(() => {
    if (!state.isBoosting) return;

    const runTwoSecondWatchdog = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (boostTransitionLockRef.current) return;

      const curFirewall = firewallState;
      const now = Date.now();

      // 1) Verify firewall/VPN layer liveness every 2 seconds and escalate to backup layer (1..1000) if dropped
      const shouldRecoverVpn =
        isNativeAndroidRuntime()
          ? curFirewall.hasVpnPermission && !curFirewall.conflictDetected && (!curFirewall.enabled || !curFirewall.persistentServiceRunning)
          : !curFirewall.enabled;

      if (shouldRecoverVpn) {
        const nextVpnLayer = ((curFirewall.vpnLayer || 1) % 1000) + 1;
        const nextFwLayer = ((curFirewall.firewallLayer || 1) % 1000) + 1;
        const safeBlocked = filterSafeBlockedPackages(appsList, curFirewall.protectedGamePkg);
        setFirewallState((prev) => ({
          ...prev,
          enabled: true,
          vpnLayer: nextVpnLayer,
          firewallLayer: nextFwLayer,
          connectionState: isNativeAndroidRuntime() ? 'RECONNECTING' : 'CONNECTED',
          layerStatusNote: `Backup VPN L#${nextVpnLayer}/1000 · FW L#${nextFwLayer}/1000`,
        }));
        if (isNativeAndroidRuntime()) {
          syncFirewallRulesToNative(
            true,
            safeBlocked,
            curFirewall.protectedGamePkg,
            appsList,
            curFirewall.blockAllNonSelected !== false
          ).catch(() => {});
        }
        addRecoveryLog('vpn', 'warning', `2s Watchdog escalated to VPN Layer #${nextVpnLayer}/1000 · FW Layer #${nextFwLayer}/1000`);
      }

      // 2) Ensure network route stability stays checked without spamming probes
      const curDiag = networkDiagnosticsRef.current;
      if (
        curDiag.autoOptimizeEnabled !== false &&
        curDiag.pingMs > 45 &&
        now - lastWatchdogProbeMsRef.current > 10000
      ) {
        lastWatchdogProbeMsRef.current = now;
        runPingProbeInternal(true).catch(() => {});
      }
    };

    const iv = setInterval(runTwoSecondWatchdog, 2000);
    return () => clearInterval(iv);
  }, [
    state.isBoosting,
    firewallState.enabled,
    firewallState.hasVpnPermission,
    firewallState.conflictDetected,
    firewallState.persistentServiceRunning,
    firewallState.vpnLayer,
    firewallState.firewallLayer,
    firewallState.protectedGamePkg,
    firewallState.blockAllNonSelected,
    appsList,
    addRecoveryLog,
    runPingProbeInternal,
  ]);

  // Append live FPS sample into 30-minute D3 history buffer (throttled localStorage writes)
  const latestStateRef = useRef(state);
  latestStateRef.current = state;
  const lastHistoryPersistMsRef = useRef<number>(0);
  const recordFpsHistoryPoint = useCallback(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const cur = latestStateRef.current;
    const now = Date.now();
    const isSessionActive = Boolean(cur.isGamingModeOn || cur.isBoosting);
    const point: FpsHistoryPoint = {
      timestamp: now,
      fps: cur.currentFps,
      targetFps: resolveNumericFps(cur.activeFps, cur.maxHardwareHz),
      profile: cur.activeProfile || 'SMART_BOOST',
      sessionActive: isSessionActive,
    };
    setFpsHistory(prev => {
      const cutoff = now - 30 * 60 * 1000;
      const last = prev[prev.length - 1];
      if (
        last &&
        now - last.timestamp < 900 &&
        last.fps === point.fps &&
        last.targetFps === point.targetFps &&
        last.profile === point.profile &&
        Boolean(last.sessionActive) === isSessionActive
      ) {
        return prev;
      }
      const next = [...prev.filter(p => p.timestamp >= cutoff), point].slice(-480);
      if (now - lastHistoryPersistMsRef.current >= 15_000) {
        lastHistoryPersistMsRef.current = now;
        try {
          localStorage.setItem('fps_booster_fps_history_v1', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
    setSmartSession(prev => {
      if (!prev.isActive) return prev;
      return {
        ...prev,
        peakTempC: Math.max(prev.peakTempC, cur.temperatureC),
        fpsSamples: [...prev.fpsSamples.slice(-119), cur.currentFps],
      };
    });
  }, []);

  useEffect(() => {
    recordFpsHistoryPoint();
  }, [state.currentFps, state.activeFps, state.activeProfile, state.isBoosting, state.isGamingModeOn, recordFpsHistoryPoint]);

  useEffect(() => {
    const sampleMs = state.batterySaverMode
      ? 10000
      : currentScreen === 'dashboard' || state.isBoosting || state.isGamingModeOn
      ? 2000
      : 6000;
    const iv = setInterval(recordFpsHistoryPoint, sampleMs);
    return () => clearInterval(iv);
  }, [currentScreen, state.isBoosting, state.isGamingModeOn, state.batterySaverMode, recordFpsHistoryPoint]);

  // Live System Thermal Monitor Polling & Gaming Session High-Temperature Warning Engine
  const thermalRef = useRef(thermalMonitor);
  thermalRef.current = thermalMonitor;
  const applyProfileRef = useRef<(profile: OptimizationProfileMode, gamePkg?: string) => Promise<void>>(async () => {});
  const lastThermalAlertChimeRef = useRef<number>(0);
  const prevThermalSeverityRef = useRef(thermalMonitor.severity);
  const isInGamingSessionRef = useRef(false);
  isInGamingSessionRef.current = Boolean(state.isGamingModeOn || state.isBoosting || smartSession.isActive);

  const refreshThermalTelemetry = useCallback(async () => {
    const curState = latestStateRef.current;
    const curThermal = thermalRef.current;
    const inSession = isInGamingSessionRef.current;

    const sample = await readSystemThermalData({
      isInGamingSession: inSession,
      activeFps: resolveNumericFps(curState.activeFps, curState.maxHardwareHz),
      isCharging: curState.isBatteryCharging,
      lastTempC: curThermal.currentTempC,
    });

    const evaluated = evaluateThermalReading({
      sample,
      prevHistory: curThermal.history,
      peakSessionTempC: inSession ? curThermal.peakSessionTempC : sample.temperatureC,
      alertThresholdC: curThermal.alertThresholdC,
      autoCoolEnabled: curThermal.autoCoolEnabled,
      isInGamingSession: inSession,
      warningDismissedAt: curThermal.warningDismissedAt,
    });

    setThermalMonitor(evaluated);

    setState(prev => ({
      ...prev,
      temperatureC: evaluated.currentTempC,
    }));

    const capStatus: DeviceCapabilitiesState['thermalStatus'] =
      evaluated.thermalStatus === 'EMERGENCY' || evaluated.thermalStatus === 'SHUTDOWN'
        ? 'CRITICAL'
        : evaluated.thermalStatus;

    setDeviceCapabilities(prev => ({
      ...prev,
      thermalStatus: capStatus,
      thermalHeadroom: evaluated.thermalHeadroom,
    }));

    // Trigger high-temperature warning feedback on transition into high/critical during gaming sessions
    const wasHot = prevThermalSeverityRef.current === 'high' || prevThermalSeverityRef.current === 'critical';
    const isNowHot = evaluated.severity === 'high' || evaluated.severity === 'critical';
    prevThermalSeverityRef.current = evaluated.severity;

    if (inSession && isNowHot && (!wasHot || Date.now() - lastThermalAlertChimeRef.current > 45_000)) {
      lastThermalAlertChimeRef.current = Date.now();
      addLog(
        `THERMAL ALERT (${evaluated.severity.toUpperCase()}): ${evaluated.currentTempC.toFixed(1)}°C (OS: ${evaluated.thermalStatus})`
      );
      setSnackBarMessage(
        `High Temp Warning: ${evaluated.currentTempC.toFixed(1)}°C — Risk of FPS throttling`
      );
      if (evaluated.autoCoolEnabled && curState.activeProfile !== 'BALANCED_MODE' && curState.activeProfile !== 'BATTERY_SAVER') {
        await applyProfileRef.current('BALANCED_MODE');
        addLog('Auto-Cool Engaged: Switched to 60 FPS Balanced profile due to high temperature.');
      }
    }
  }, []);

  useEffect(() => {
    const stopPressure = startComputePressureObserver();
    refreshThermalTelemetry();

    const intervalMs = state.batterySaverMode
      ? 10000
      : state.isGamingModeOn || state.isBoosting || smartSession.isActive || currentScreen === 'dashboard'
      ? 2000
      : 5000;

    const iv = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        refreshThermalTelemetry();
      }
    }, intervalMs);

    let nativeListenerHandle: { remove: () => Promise<void> } | null = null;
    if (isNativeAndroidRuntime()) {
      GamingEngineNative.addListener('thermalStatusChanged', () => {
        refreshThermalTelemetry();
      })
        .then((handle) => {
          nativeListenerHandle = handle;
        })
        .catch(() => {});
    }

    return () => {
      stopPressure();
      clearInterval(iv);
      if (nativeListenerHandle) {
        nativeListenerHandle.remove().catch(() => {});
      }
    };
  }, [state.isGamingModeOn, state.isBoosting, state.batterySaverMode, smartSession.isActive, currentScreen, refreshThermalTelemetry]);

  const setThermalAlertThreshold = (celsius: number) => {
    sound.playClick();
    setState(prev => ({ ...prev, thermalAlertThresholdC: celsius }));
    setThermalMonitor(prev => ({ ...prev, alertThresholdC: celsius, warningDismissedAt: null }));
    setSnackBarMessage(`Thermal alert threshold set to ${celsius}°C`);
  };

  const toggleAutoCoolOnHighTemp = () => {
    const next = !thermalMonitor.autoCoolEnabled;
    sound.playToggle(next);
    setState(prev => ({ ...prev, autoCoolOnHighTemp: next }));
    setThermalMonitor(prev => ({ ...prev, autoCoolEnabled: next }));
    setSnackBarMessage(next ? 'Auto-Cool 60 FPS enabled for high temps' : 'Auto-Cool disabled');
  };

  const dismissThermalWarning = () => {
    sound.playClick();
    setThermalMonitor(prev => ({
      ...prev,
      isHighTempWarning: false,
      warningDismissedAt: Date.now(),
    }));
  };

  const applyThermalCooldownProfile = async () => {
    await applyOptimizationProfile('BALANCED_MODE');
    setThermalMonitor(prev => ({
      ...prev,
      isHighTempWarning: false,
      warningDismissedAt: Date.now(),
    }));
    setSnackBarMessage('Cooling Profile Active: 60 FPS Balanced Mode');
    addLog('User engaged 60 FPS Balanced Cooling Profile from Thermal Monitor.');
  };

  // Apply Optimization Profile (5 modes + native ADPF/GameManager/refresh-rate bridge)
  const applyOptimizationProfile = async (
    profileId: OptimizationProfileMode,
    gamePkg?: string,
    options?: { skipFirestoreSync?: boolean; preserveSessionState?: boolean }
  ) => {
    if (!options?.skipFirestoreSync) {
      haptics.impactMedium();
      sound.playBoost();
    }
    const profileSpec =
      cloudBackend.remoteProfiles.find(p => p.id === profileId) ||
      OPTIMIZATION_PROFILES.find(p => p.id === profileId) ||
      OPTIMIZATION_PROFILES[0];

    setState(prev => ({
      ...prev,
      activeProfile: profileSpec.id,
      activeFps: profileSpec.targetFps,
      performanceMode: profileSpec.performanceMode,
      reduceLag: profileSpec.reduceLag,
      improveRendering: profileSpec.improveRendering,
      graphicsOptimized: profileSpec.graphicsOptimized,
      // Never force isGamingModeOn=true while Master Boost is OFF
      isGamingModeOn: prev.isGamingModeOn,
    }));

    const nativeRes = await engageNativeProfile(
      profileSpec.id,
      resolveNumericFps(profileSpec.targetFps, state.maxHardwareHz),
      gamePkg || firewallState.protectedGamePkg
    );

    addLog(
      `Profile Active: ${profileSpec.name} (${profileSpec.targetFps} FPS${nativeRes.adpfEngaged ? ', ADPF Engaged' : ''})`
    );
    if (!options?.skipFirestoreSync) {
      setSnackBarMessage(`${profileSpec.name} Engaged (${profileSpec.targetFps} FPS Target)`);
      syncUserToFirestore({
        userId,
        name: auth.currentUser?.displayName || 'Gamer',
        isPro: false,
        proExpiry: null,
        activeFps: mapFpsForFirestore(profileSpec.targetFps, state.maxHardwareHz),
        activeProfile: profileSpec.id,
      });
    }
  };
  applyProfileRef.current = applyOptimizationProfile;

  // Crash Diagnostic Helper (used by App ErrorBoundary & Settings diagnostic test)
  const logCrashDiagnostic = async (message: string, stack?: string, screenName?: string) => {
    const item: CrashDiagnosticItem = {
      id: `CRASH_${Date.now().toString(36)}`,
      userId,
      message: message.slice(0, 500),
      stack: stack ? stack.slice(0, 2000) : undefined,
      screen: screenName || currentScreen,
      platform: isNativeAndroidRuntime() ? 'android' : 'web',
      appVersion: cloudBackend.remoteConfig.configVersion || 'v3.2.0',
      createdAt: Date.now(),
    };
    setCrashDiagnostics(prev => [item, ...prev.slice(0, 14)]);
    await reportCrashToFirestore(item);
  };

  // Save a snapshot report cleanly on demand
  const submitManualPerformanceSnapshot = async () => {
    const samples = fpsHistory.slice(-20).map(p => p.fps);
    const avg = samples.length ? Math.round(samples.reduce((s, v) => s + v, 0) / samples.length) : state.currentFps;
    const min = samples.length ? Math.min(...samples) : state.currentFps;
    const max = samples.length ? Math.max(...samples) : state.currentFps;
    const report: PerformanceReportItem = {
      id: `PERF_${Date.now().toString(36)}`,
      userId,
      gameName: activeGame?.name || firewallState.protectedGameName || 'Manual Diagnostics',
      profileMode: state.activeProfile,
      avgFps: avg,
      minFps: min,
      maxFps: max,
      avgPingMs: activeRegion.currentPingMs,
      packetLossPercent: networkDiagnostics.packetLossPercent,
      peakTempC: state.temperatureC,
      blockedAppsCount: appsList.filter(a => a.isBlocked).length,
      durationSec: smartSession.startedAt ? Math.round((Date.now() - smartSession.startedAt) / 1000) : 60,
      createdAt: Date.now(),
    };
    const ok = await savePerformanceReportToFirestore(report);
    setPerformanceReports(prev => [report, ...prev.slice(0, 9)]);
    setSnackBarMessage(ok ? 'Performance Report Synced to Cloud!' : 'Performance Report Saved Locally');
  };

  // Firewall Controls: Permission, Save/Restore, Master ON/OFF, Protected Game, Auto Presets
  const saveFirewallSnapshotInternal = async () => {
    const blockedIds = appsList.filter(a => a.isBlocked).map(a => a.id);
    try {
      localStorage.setItem(
        'fps_booster_firewall_snapshot_v1',
        JSON.stringify({ blockedIds, enabled: firewallState.enabled })
      );
    } catch {}
    setFirewallState(prev => ({
      ...prev,
      hasPreviousSnapshot: true,
      previousSnapshotBlockedIds: blockedIds,
      previousSnapshotEnabled: prev.enabled,
    }));
    if (isNativeAndroidRuntime()) {
      try {
        await GamingFirewallNative.savePreviousConfig();
      } catch {}
    }
  };

  const requestFirewallVpnPermission = async (): Promise<boolean> => {
    if (!isNativeAndroidRuntime()) {
      setSnackBarMessage('Android APK required for system VpnService permission');
      return false;
    }
    try {
      const res = await GamingFirewallNative.requestVpnPermission();
      setFirewallState(prev => ({ ...prev, hasVpnPermission: res.granted }));
      setSnackBarMessage(res.granted ? 'VPN Firewall Permission Granted!' : 'VPN Permission Cancelled');
      return res.granted;
    } catch {
      return false;
    }
  };

  const syncFirewallRulesToNative = async (
    nextEnabled: boolean,
    blockedPkgs: string[],
    gamePkg: string,
    overrideApps?: AppBlockItem[],
    overrideBlockAll?: boolean
  ) => {
    if (!isNativeAndroidRuntime()) return { started: nextEnabled, needsPermission: false, conflictDetected: false };
    try {
      if (nextEnabled) {
        const sourceApps = overrideApps || appsList;
        const allowedPkgs = filterAllowedPackages(sourceApps, gamePkg);
        const blockAll =
          typeof overrideBlockAll === 'boolean'
            ? overrideBlockAll
            : firewallState.blockAllNonSelected !== false;
        const res = await GamingFirewallNative.startFirewall({
          blockedPackages: blockedPkgs,
          allowedPackages: allowedPkgs,
          blockAllNonSelected: blockAll,
          boostExpiresAtMs: latestStateRef.current.boostExpiresAtMs || undefined,
          protectedGamePackage: gamePkg,
          dnsFilter: firewallState.dnsFilterEnabled,
        });
        if (res.conflictDetected) {
          addRecoveryLog('vpn', 'error', 'Third-party VPN conflict detected — pause external VPN first.');
          setSnackBarMessage('Another VPN is active — pause it to enable Local Firewall');
        } else if (res.needsPermission) {
          setSnackBarMessage('Grant Android VPN Permission to activate firewall tunnel');
        }
        return res;
      } else {
        await GamingFirewallNative.stopFirewall();
        return { started: false, needsPermission: false, conflictDetected: false };
      }
    } catch {
      return { started: false, needsPermission: false, conflictDetected: false };
    }
  };

  const toggleBlockAllNonSelected = () => {
    const next = firewallState.blockAllNonSelected === false;
    haptics.selection();
    sound.playToggle(next);
    setFirewallState(prev => ({ ...prev, blockAllNonSelected: next }));
    const blockedPkgs = filterSafeBlockedPackages(appsList, firewallState.protectedGamePkg);
    if (state.isBoosting && firewallState.enabled) {
      syncFirewallRulesToNative(true, blockedPkgs, firewallState.protectedGamePkg, appsList, next);
    }
    setSnackBarMessage(
      next
        ? 'Global Firewall: All non-selected BG apps blocked (Game protected)'
        : 'Selective Mode: Only toggled-blocked apps filtered'
    );
  };

  const toggleDnsFilter = () => {
    const next = !firewallState.dnsFilterEnabled;
    haptics.selection();
    sound.playToggle(next);
    setFirewallState(prev => ({ ...prev, dnsFilterEnabled: next }));
    const blockedPkgs = filterSafeBlockedPackages(appsList, firewallState.protectedGamePkg);
    if (state.isBoosting && firewallState.enabled) {
      syncFirewallRulesToNative(true, blockedPkgs, firewallState.protectedGamePkg);
    }
    setSnackBarMessage(
      next
        ? 'Background DNS Filtering Rule Enabled'
        : 'Background DNS Filtering Rule Disabled'
    );
  };

  const setProtectedGame = async (game: GameItem) => {
    haptics.selection();
    sound.playClick();
    setSelectedSuperBoostGamePkg(game.packageName);
    setFirewallState(prev => ({
      ...prev,
      protectedGamePkg: game.packageName,
      protectedGameName: game.name,
    }));
    const blockedPkgs = filterSafeBlockedPackages(appsList, game.packageName);
    if (state.isBoosting && firewallState.enabled) {
      await syncFirewallRulesToNative(true, blockedPkgs, game.packageName);
    }
    setSnackBarMessage(`Protected Game Internet: ${game.name}`);
  };

  // Configures preset rules only; activates VPN tunnel ONLY when master BOOST ON is active
  const applyFirewallPreset = async (preset: FirewallPresetMode) => {
    haptics.impactMedium();
    sound.playShield();
    await saveFirewallSnapshotInternal();
    try {
      localStorage.setItem('fps_booster_custom_block_rules_v1', preset === 'social_keep' ? '1' : '0');
    } catch {}
    let nextApps = appsList;
    if (preset === 'esports_strict') {
      nextApps = appsList.map(app => ({ ...app, isBlocked: true }));
    } else if (preset === 'social_keep') {
      const allowIds = new Set(['WhatsApp', 'Messenger', 'Telegram']);
      nextApps = appsList.map(app => ({ ...app, isBlocked: !allowIds.has(app.name) }));
    }
    setAppsList(nextApps);
    setFirewallState(prev => ({
      ...prev,
      preset,
    }));
    const blockedPkgs = filterSafeBlockedPackages(nextApps, firewallState.protectedGamePkg);
    if (state.isBoosting && firewallState.enabled) {
      await syncFirewallRulesToNative(true, blockedPkgs, firewallState.protectedGamePkg);
      setSnackBarMessage(
        `Applied & Synced ${preset === 'esports_strict' ? 'Esports Strict' : 'Keep Chat'} Rules`
      );
    } else {
      setSnackBarMessage(
        `Saved ${preset === 'esports_strict' ? 'Esports Strict' : 'Keep Chat'} Rules — Tap BOOST ON to Activate`
      );
    }
    addLog(`Firewall Rules Saved (${preset.toUpperCase()}): ${blockedPkgs.length} apps configured`);
  };

  const restorePreviousFirewallRules = async () => {
    haptics.impactLight();
    sound.playClick();
    if (!firewallState.previousSnapshotBlockedIds) {
      setSnackBarMessage('No previous firewall snapshot stored yet');
      return;
    }
    const prevBlockedSet = new Set(firewallState.previousSnapshotBlockedIds);
    const restoredApps = appsList.map(app => ({ ...app, isBlocked: prevBlockedSet.has(app.id) }));
    setAppsList(restoredApps);
    setFirewallState(prev => ({
      ...prev,
      preset: 'custom',
    }));
    if (state.isBoosting && firewallState.enabled) {
      const blockedPkgs = filterSafeBlockedPackages(restoredApps, firewallState.protectedGamePkg);
      await syncFirewallRulesToNative(true, blockedPkgs, firewallState.protectedGamePkg);
    }
    addRecoveryLog('vpn', 'info', 'Previous background blocking rule list restored safely.');
    addLog('Restored previous background app blocking rules.');
    setSnackBarMessage('Previous App Blocking Rules Restored');
  };

  const setFpsMode = (mode: FPSMode) => {
    haptics.selection();
    sound.playClick();
    setState(prev => ({ ...prev, activeFps: mode }));
    setSnackBarMessage(`${mode} FPS Selected`);
  };

  const toggleAppBlock = (id: string) => {
    haptics.selection();
    sound.playClick();
    try {
      localStorage.setItem('fps_booster_custom_block_rules_v1', '1');
    } catch {}
    setFirewallState(prev => ({ ...prev, preset: 'custom' }));
    setAppsList(prev => {
      const updated = prev.map(app => {
        if (app.id === id) {
          const next = !app.isBlocked;
          addLog(next ? `Rule: Restricted background data for ${app.name}` : `Rule: Allowed background data for ${app.name}`);
          return { ...app, isBlocked: next };
        }
        return app;
      });
      const blockedPkgs = filterSafeBlockedPackages(updated, firewallState.protectedGamePkg);
      if (state.isBoosting && firewallState.enabled) {
        syncFirewallRulesToNative(true, blockedPkgs, firewallState.protectedGamePkg);
      }
      return updated;
    });
  };

  const toggleAllAppsBlock = (blockAll: boolean) => {
    haptics.impactMedium();
    sound.playShield();
    try {
      localStorage.setItem('fps_booster_custom_block_rules_v1', blockAll ? '0' : '1');
    } catch {}
    setFirewallState(prev => ({
      ...prev,
      preset: blockAll ? 'esports_strict' : 'custom',
      blockAllNonSelected: blockAll,
    }));
    const updated = appsList.map(app => ({ ...app, isBlocked: blockAll }));
    setAppsList(updated);
    const blockedPkgs = filterSafeBlockedPackages(updated, firewallState.protectedGamePkg);
    if (state.isBoosting && firewallState.enabled) {
      syncFirewallRulesToNative(true, blockedPkgs, firewallState.protectedGamePkg, updated, blockAll);
    }
    addLog(blockAll ? 'Rules: All background apps marked restricted' : 'Rules: All apps allowed');
  };

  const resetAppBlockRules = () => {
    haptics.impactLight();
    sound.playClick();
    try {
      localStorage.removeItem('fps_booster_custom_block_rules_v1');
    } catch {}
    const defaultBlocked = new Set([
      'com.google.android.youtube',
      'com.instagram.android',
      'com.facebook.katana',
      'com.netflix.mediaclient',
    ]);
    const updated = appsList.map(app => ({
      ...app,
      isBlocked: defaultBlocked.has(app.packageName),
    }));
    setAppsList(updated);
    setFirewallState(prev => ({ ...prev, preset: 'custom' }));
    if (state.isBoosting && firewallState.enabled) {
      const blockedPkgs = filterSafeBlockedPackages(updated, firewallState.protectedGamePkg);
      syncFirewallRulesToNative(true, blockedPkgs, firewallState.protectedGamePkg);
    }
    setSnackBarMessage('Background App Rules Reset to Default');
    addLog('Rules: Reset background app filter rules to defaults.');
  };

  const toggleBatterySaver = async () => {
    const next = !Boolean(state.batterySaverMode);
    haptics.impactMedium();
    sound.playToggle(next);

    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>)['__FPS_BATTERY_SAVER__'] = next;
    }

    setState(prev => ({
      ...prev,
      batterySaverMode: next,
    }));

    const brightnessApplied = await applyNativeScreenBrightness(next, 0.3);

    if (next && state.activeProfile !== 'BATTERY_SAVER') {
      await applyOptimizationProfile('BATTERY_SAVER', undefined, {
        skipFirestoreSync: true,
        preserveSessionState: true,
      });
    } else if (!next && state.activeProfile === 'BATTERY_SAVER') {
      await applyOptimizationProfile('SMART_BOOST', undefined, {
        skipFirestoreSync: true,
        preserveSessionState: true,
      });
    }

    if (!next) {
      updateRealStats();
    }

    addLog(
      next
        ? `Battery Saver ON: Background telemetry throttled & screen dimmed${brightnessApplied ? ' (Native Window)' : ' (Preview)'}`
        : 'Battery Saver OFF: Normal background cadence & display brightness restored'
    );
    setSnackBarMessage(
      next
        ? 'Battery Saver ON • Background Throttled & Dimmed'
        : 'Battery Saver OFF • Normal Brightness Restored'
    );
  };

  const refreshHardwareTelemetry = async () => {
    await updateRealStats();
    const s = await getStorageStats();
    setState(prev => ({
      ...prev,
      storage: {
        freeGb: parseFloat(s.freeGb) || prev.storage?.freeGb || 0,
        totalGb: parseFloat(s.totalGb) || prev.storage?.totalGb || 0,
        usedPercent: s.usedPercent ?? prev.storage?.usedPercent ?? 0,
        appTempCacheKb: s.appTempCacheKb ?? 0,
        isNativeStorage: Boolean(s.isNativeStorage),
      },
    }));
    addLog('Hardware telemetry & storage diagnostics refreshed.');
  };

  // User-permission-gated temporary cache cleanup (only clears app's own sandbox cache)
  const clearTemporaryCache = async () => {
    sound.playBoost();
    const result = await clearAppTempCache();
    setState(prev => ({
      ...prev,
      storage: {
        freeGb: parseFloat(result.freeGb) || prev.storage?.freeGb || 0,
        totalGb: parseFloat(result.totalGb) || prev.storage?.totalGb || 0,
        usedPercent: result.usedPercent ?? prev.storage?.usedPercent ?? 0,
        appTempCacheKb: result.remainingCacheKb ?? 0,
        isNativeStorage: Boolean(result.isNativeStorage),
      },
    }));
    addLog(`Temp Cache Cleaned (User Confirmed): Freed ${result.freedKb} KB app cache.`);
    setSnackBarMessage(
      result.freedKb > 0
        ? `App Temp Cache Cleared (${result.freedKb} KB Freed)`
        : 'App Temp Cache Already Clean (0 KB)'
    );
    return result;
  };

  // Backwards-compatible non-fabricated refresh stub (zero fake RAM MB or process killing)
  const cleanRam = () => {
    sound.playClick();
    updateRealStats();
    addLog('RAM & hardware telemetry refreshed from OS MemoryInfo.');
    return { freedMb: 0, newPercent: state.ramUsagePercent };
  };

  const applyGraphicsSettings = (newSettings: Partial<BoosterState>) => {
    haptics.success();
    sound.playSuccess();
    setState(prev => ({ ...prev, ...newSettings }));
    addLog('Graphics profile applied: Hardware frame pacing updated');
  };

  const updateSetting = <K extends keyof BoosterState>(key: K, value: BoosterState[K]) => {
    haptics.selection();
    sound.playClick();
    setState(prev => ({ ...prev, [key]: value }));
  };

  const updatePerGameProfile = (gamePackage: string, patch: Partial<PerGameProfile>) => {
    sound.playClick();
    setPerGameProfiles(prev => {
      const existing: PerGameProfile = prev[gamePackage] || {
        gamePackage,
        profileMode: state.activeProfile,
        targetFps: state.activeFps,
        resolutionScale: state.resolutionScale,
        firewallPreset: firewallState.preset,
        updatedAt: Date.now(),
      };
      return {
        ...prev,
        [gamePackage]: {
          ...existing,
          ...patch,
          updatedAt: Date.now(),
        },
      };
    });
    setSnackBarMessage('Per-Game Profile Saved');
    addLog(`Saved optimization profile for ${gamePackage}`);
  };

  // Real-time Performance Bottleneck Analyzer & Device-Capable Recommendations
  const bottleneckReport: BottleneckReport = useMemo(() => {
    const items: BottleneckItem[] = [];
    const maxHz = state.maxHardwareHz || 60;
    const requestedFps = resolveNumericFps(state.activeFps, maxHz);

    // 1. Hardware Refresh Rate Constraint
    if (requestedFps > maxHz) {
      items.push({
        id: 'display_cap',
        area: 'display',
        severity: 'warning',
        title: `Target ${requestedFps} FPS Exceeds ${maxHz}Hz Display`,
        detail: `Hardware panel supports up to ${maxHz}Hz. Android caps actual frame output at display refresh rate.`,
        recommendation: `Switch target to ${maxHz >= 90 ? '90' : '60'} FPS to reduce wasted GPU heat.`,
      });
    }

    // 2. Thermal Throttling Risk
    if (
      state.temperatureC >= 41 ||
      deviceCapabilities.thermalStatus === 'SEVERE' ||
      deviceCapabilities.thermalStatus === 'CRITICAL'
    ) {
      items.push({
        id: 'thermal_high',
        area: 'thermal',
        severity: 'critical',
        title: `Thermal Pressure (${state.temperatureC.toFixed(1)}°C)`,
        detail: 'Elevated battery/chassis temperature causes Android thermal throttling and FPS drops.',
        recommendation: 'Switch to Balanced or 60 FPS, avoid charging while gaming, and lower screen brightness.',
      });
    } else if (state.temperatureC >= 38 || deviceCapabilities.thermalStatus === 'MODERATE') {
      items.push({
        id: 'thermal_warm',
        area: 'thermal',
        severity: 'warning',
        title: `Warm Device (${state.temperatureC.toFixed(1)}°C)`,
        detail: 'Approaching thermal throttling threshold during extended matches.',
        recommendation: 'Monitor temps and prefer Smart Boost profile.',
      });
    }

    // 3. RAM Pressure
    if (state.ramUsagePercent >= 82 || (state.totalRamGb > 0 && state.totalRamGb - state.ramUsedGb < 0.7)) {
      items.push({
        id: 'ram_pressure',
        area: 'ram',
        severity: 'warning',
        title: `High RAM Usage (${state.ramUsagePercent}%)`,
        detail: `Only ${Math.max(0, state.totalRamGb - state.ramUsedGb).toFixed(1)} GB free. Background apps may cause micro-stutters.`,
        recommendation: 'Close heavy media apps manually before launching your game.',
      });
    }

    // 4. Network / Offline / Latency Bottleneck
    if (state.isOnline === false) {
      items.push({
        id: 'network_offline',
        area: 'network',
        severity: 'critical',
        title: 'No Internet Connection',
        detail: 'Device appears offline. Live matchmaking ping and cloud sync paused.',
        recommendation: 'Reconnect to stable Wi-Fi or 5G/LTE.',
      });
    } else if (activeRegion.currentPingMs > 150 || networkDiagnostics.packetLossPercent > 0) {
      items.push({
        id: 'network_latency',
        area: 'network',
        severity: activeRegion.currentPingMs > 200 ? 'critical' : 'warning',
        title: `Network Latency (${activeRegion.currentPingMs}ms, ${networkDiagnostics.packetLossPercent}% loss)`,
        detail: 'High ping or jitter on current server route causes rubber-banding.',
        recommendation: 'Select lowest-ping server route and turn ON Local VPN Blocker on Android.',
      });
    }

    // 5. Low Battery Saver
    if (state.batteryLevel <= 20 && !state.isBatteryCharging) {
      items.push({
        id: 'battery_low',
        area: 'battery',
        severity: 'warning',
        title: `Low Battery (${state.batteryLevel}%)`,
        detail: 'Android OS throttles CPU boost clocks below 20% charge.',
        recommendation: 'Use Battery Saver profile or plug in a cooler charger.',
      });
    }

    // Recommended honest FPS based on hardware Hz + thermal + RAM + battery
    let recommendedFps: FPSMode = '60';
    let recommendedProfile: OptimizationProfileMode = 'SMART_BOOST';
    if (state.temperatureC >= 41 || state.batteryLevel <= 20) {
      recommendedFps = '60';
      recommendedProfile = 'BATTERY_SAVER';
    } else if (maxHz >= 120 && state.totalRamGb >= 6 && state.temperatureC < 38) {
      recommendedFps = '120';
      recommendedProfile = 'PERFORMANCE_MODE';
    } else if (maxHz >= 90 && state.totalRamGb >= 4) {
      recommendedFps = '90';
      recommendedProfile = 'SMART_BOOST';
    }

    const hasCritical = items.some(i => i.severity === 'critical');
    const hasWarning = items.some(i => i.severity === 'warning');
    const level: BottleneckReport['level'] = hasCritical ? 'critical' : hasWarning ? 'warning' : 'optimal';
    const summary =
      items.length === 0
        ? `Optimal for ${maxHz}Hz • No thermal, RAM, or network bottlenecks detected`
        : `${items.length} bottleneck${items.length > 1 ? 's' : ''} detected • Recommended: ${recommendedFps} FPS`;

    return {
      level,
      summary,
      bottlenecks: items,
      recommendedFps,
      recommendedProfile,
    };
  }, [
    state.maxHardwareHz,
    state.activeFps,
    state.temperatureC,
    state.ramUsagePercent,
    state.ramUsedGb,
    state.totalRamGb,
    state.isOnline,
    state.batteryLevel,
    state.isBatteryCharging,
    activeRegion.currentPingMs,
    networkDiagnostics.packetLossPercent,
    deviceCapabilities.thermalStatus,
  ]);

  // UNIFIED ONE-TAP SUPER BOOST MASTER CONTROLLER (BOOST ON / BOOST OFF)
  // Atomically coordinates: (1) Game Profile + Gaming Mode, (2) RAM Trim + DND, (3) VpnService Firewall + Blocking Rules, (4) Single Boost Timer + BoostDetails Modal
  const executeAtomicBoostStart = async (explicitGame?: GameItem) => {
    if (
      boostTransitionLockRef.current ||
      superBoost.status === 'activating' ||
      superBoost.status === 'stopping'
    ) {
      return;
    }

    const gameObj =
      explicitGame ||
      gamesList.find((g) => g.packageName === selectedSuperBoostGamePkg) ||
      gamesList[0];

    // Prevent duplicate Boost/VPN session if already active
    if (superBoost.status === 'active' || state.isBoosting) {
      if (explicitGame && explicitGame.packageName !== superBoost.selectedGamePackage) {
        await setProtectedGame(explicitGame);
        setActiveGame(explicitGame);
        setSnackBarMessage(`Switched protected game to ${explicitGame.name}`);
      }
      return;
    }

    boostTransitionLockRef.current = true;
    try {
      const advanceStep = (idx: number, label: string, doneList: number[]) => {
        setSuperBoost((prev) => ({
          ...prev,
          status: 'activating',
          currentStepIndex: idx,
          currentStepLabel: label,
          completedSteps: doneList,
          selectedGamePackage: gameObj.packageName,
          selectedGameName: gameObj.name,
          errorMessage: null,
        }));
      };

      haptics.boostStart();
      sound.playBoost();
      setSelectedSuperBoostGamePkg(gameObj.packageName);
      setActiveGame(gameObj);

      // Step 1: Select game profile & resolve effective Gaming Mode parameters
      advanceStep(1, `Applying optimization profile for ${gameObj.name}...`, []);
      const gameProf = perGameProfiles[gameObj.packageName];
      const effectiveProfile = state.batterySaverMode
        ? 'BATTERY_SAVER'
        : gameProf?.profileMode || state.activeProfile;
      const effectiveFps = state.batterySaverMode
        ? '60'
        : gameProf?.targetFps || state.activeFps;
      const profileSpec =
        OPTIMIZATION_PROFILES.find((p) => p.id === effectiveProfile) || OPTIMIZATION_PROFILES[0];

      await saveFirewallSnapshotInternal();

      let activeAppsSnapshot = appsList;
      let userCustomizedRules = false;
      try {
        userCustomizedRules = localStorage.getItem('fps_booster_custom_block_rules_v1') === '1';
      } catch {}

      if (gameProf?.firewallPreset === 'social_keep' || firewallState.preset === 'social_keep') {
        const allowIds = new Set(['WhatsApp', 'Messenger', 'Telegram']);
        activeAppsSnapshot = appsList.map((app) => ({ ...app, isBlocked: !allowIds.has(app.name) }));
        setAppsList(activeAppsSnapshot);
      } else if (!userCustomizedRules || firewallState.preset === 'esports_strict') {
        // Strict 25-app blocking by default unless user explicitly customized rules
        activeAppsSnapshot = appsList.map((app) => ({ ...app, isBlocked: true }));
        setAppsList(activeAppsSnapshot);
      }

      const safeBlockedPkgs = filterSafeBlockedPackages(activeAppsSnapshot, gameObj.packageName);
      const allowedPkgs = filterAllowedPackages(activeAppsSnapshot, gameObj.packageName);
      const useBlockAllMode =
        gameProf?.firewallPreset === 'esports_strict' ||
        firewallState.blockAllNonSelected !== false;
      const blockedNames = activeAppsSnapshot
        .filter((a) => a.isBlocked && safeBlockedPkgs.includes(a.packageName))
        .map((a) => a.name);

      await applyOptimizationProfile(effectiveProfile, gameObj.packageName, { skipFirestoreSync: true });

      // Step 2: Background RAM trim + DND silencing (native Android when granted)
      advanceStep(3, `Trimming background processes & enabling Focus DND...`, [1, 2]);
      const [ramTrimRes, dndRes] = await Promise.all([
        trimNativeBackgroundMemory(safeBlockedPkgs, gameObj.packageName),
        setNativeDndMode(true),
      ]);

      // Step 3: Initiate VpnService Firewall + Background Data Blocking Rules + Fast DNS 1.1.1.1
      advanceStep(
        6,
        `Starting Local VPN Firewall + Fast DNS 1.1.1.1 (${safeBlockedPkgs.length} apps filtered)...`,
        [1, 2, 3, 4, 5]
      );

      let vpnReady = true;
      if (isNativeAndroidRuntime()) {
        try {
          await GamingFirewallNative.requestNotificationPermission().catch(() => {});
          const st = await GamingFirewallNative.getFirewallStatus();
          if (!st.permissionGranted) {
            vpnReady = await requestFirewallVpnPermission();
          }
        } catch {
          vpnReady = false;
        }
      }

      const availableSec = latestStateRef.current.boostTimeRemainingSec || 0;
      const sessionSec = availableSec > 0 ? availableSec : 1800;
      const sessionMins = Math.max(1, Math.ceil(sessionSec / 60));
      const startedAt = Date.now();
      const expiresAtMs = latestStateRef.current.boostExpiresAtMs && latestStateRef.current.boostExpiresAtMs > startedAt
        ? latestStateRef.current.boostExpiresAtMs
        : startedAt + sessionSec * 1000;

      const vpnTask = async (): Promise<{ ok: boolean; warning: string | null }> => {
        if (!isNativeAndroidRuntime()) {
          return { ok: true, warning: null };
        }
        if (!vpnReady) {
          const msg = 'VPN permission not granted — Boost active without VpnService tunnel';
          addRecoveryLog('vpn', 'warning', msg);
          return { ok: false, warning: msg };
        }
        const fwRes = await GamingFirewallNative.startFirewall({
          blockedPackages: safeBlockedPkgs,
          allowedPackages: allowedPkgs,
          blockAllNonSelected: useBlockAllMode,
          boostExpiresAtMs: expiresAtMs,
          protectedGamePackage: gameObj.packageName,
          dnsFilter: true,
        });
        if (fwRes.conflictDetected) {
          const msg = 'Another VPN is active — Local VPN Firewall paused';
          addRecoveryLog('vpn', 'error', msg);
          return { ok: false, warning: msg };
        }
        if (fwRes.needsPermission) {
          const msg = 'VPN consent required — optimization running without tunnel';
          addRecoveryLog('vpn', 'warning', msg);
          return { ok: false, warning: msg };
        }
        return { ok: Boolean(fwRes.started), warning: null };
      };

      const [vpnOutcome] = await Promise.all([
        vpnTask(),
        refreshHardwareTelemetry(),
        runPingProbe(true),
        refreshThermalTelemetry(),
      ]);

      // Step 4: Start unified Ad-Unlocked countdown timer & lock game server route
      const vpnStartedOk = vpnOutcome.ok;
      const vpnWarningMsg = vpnOutcome.warning;
      const nextVpnState = vpnStartedOk
        ? isNativeAndroidRuntime()
          ? 'CONNECTING'
          : 'CONNECTED'
        : 'READY';

      setFirewallState((prev) => ({
        ...prev,
        enabled: vpnStartedOk,
        vpnLayer: vpnStartedOk ? (prev.vpnLayer || 1) : 1,
        firewallLayer: vpnStartedOk ? (prev.firewallLayer || 1) : 1,
        layerStatusNote: vpnStartedOk
          ? `VPN L#${prev.vpnLayer || 1}/1000 · FW L#${prev.firewallLayer || 1}/1000`
          : 'Guard Ready',
        dnsFilterEnabled: true,
        blockAllNonSelected: useBlockAllMode,
        persistentServiceRunning: isNativeAndroidRuntime() ? vpnStartedOk : prev.persistentServiceRunning,
        protectedGamePkg: gameObj.packageName,
        protectedGameName: gameObj.name,
        preset: gameProf?.firewallPreset || prev.preset,
        connectionState: nextVpnState,
      }));

      setNetworkDiagnostics((prev) => ({
        ...prev,
        isRouteLocked: true,
        fastDnsServer: '1.1.1.1 / 1.0.0.1',
      }));

      setState((prev) => ({
        ...prev,
        isGamingModeOn: true,
        isBoosting: true,
        isVpnActive: vpnStartedOk,
        activeFps: effectiveFps,
        resolutionScale: gameProf?.resolutionScale || prev.resolutionScale,
        boostExpiresAtMs: expiresAtMs,
        activeSessionStartedAtMs: startedAt,
        boostTimeRemainingSec: sessionSec,
        boostDurationTotalSec: Math.max(prev.boostDurationTotalSec || 0, sessionSec),
      }));

      setSmartSession({
        isActive: true,
        startedAt,
        gameName: gameObj.name,
        gamePackage: gameObj.packageName,
        profileUsed: effectiveProfile,
        completedSteps: [1, 2, 3, 4, 5, 6],
        peakTempC: state.temperatureC,
        fpsSamples: [state.currentFps],
      });

      const summary: BoostSessionSummary = {
        protectedGameName: gameObj.name,
        protectedGamePackage: gameObj.packageName,
        profileId: effectiveProfile,
        profileName: profileSpec.name,
        targetFps: effectiveFps,
        maxHardwareHz: state.maxHardwareHz || 60,
        vpnConnectionState: nextVpnState,
        vpnTransport: isNativeAndroidRuntime() ? 'LOCAL_VPN_TUNNEL' : 'LOCAL_FILTER_RULES',
        vpnActive: vpnStartedOk,
        isNativeAndroid: isNativeAndroidRuntime(),
        persistentServiceActive: isNativeAndroidRuntime() ? vpnStartedOk : true,
        blockedAppsCount: safeBlockedPkgs.length,
        blockedAppNames: blockedNames,
        dnsFilterEnabled: true,
        dndActive: Boolean(dndRes.applied),
        gamingModeActive: true,
        ramFreedMb: ramTrimRes.freedMb,
        ramUsagePercent: latestStateRef.current.ramUsagePercent,
        trimmedBackgroundCount: ramTrimRes.trimmedCount,
        durationMinutes: sessionMins,
        startedAt,
      };
      setBoostDetailsSummary(summary);
      setIsBoostDetailsOpen(true);

      const completed = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      setSuperBoost({
        status: 'active',
        currentStepIndex: 10,
        currentStepLabel:
          vpnWarningMsg ||
          (isNativeAndroidRuntime()
            ? `BOOST ON · Android VpnService Filtering ${safeBlockedPkgs.length} Apps`
            : `BOOST ON · Local Filter Engine (${safeBlockedPkgs.length} Apps Restricted)`),
        completedSteps: completed,
        startedAt,
        selectedGamePackage: gameObj.packageName,
        selectedGameName: gameObj.name,
        errorMessage: vpnWarningMsg,
      });

      addRecoveryLog(
        'session',
        vpnWarningMsg ? 'warning' : 'info',
        `Boost ON for ${gameObj.name} (${effectiveFps} FPS, ${safeBlockedPkgs.length} apps filtered, DNS 1.1.1.1)`
      );
      addLog(`BOOST ON: ${gameObj.name} protected • ${safeBlockedPkgs.length} BG apps filtered • Route Locked.`);
      setSnackBarMessage(
        vpnWarningMsg
          ? `${gameObj.name} Boosted (VPN Warning)`
          : `BOOST ON • ${gameObj.name} Protected!`
      );
      syncUserToFirestore({
        userId,
        name: auth.currentUser?.displayName || 'Gamer',
        isPro: false,
        proExpiry: null,
        activeFps: mapFpsForFirestore(effectiveFps, state.maxHardwareHz),
        activeProfile: effectiveProfile,
        totalBoostTime: (state.boostDurationTotalSec || 0) + sessionSec,
      });
    } finally {
      boostTransitionLockRef.current = false;
    }
  };
  executeAtomicBoostStartRef.current = executeAtomicBoostStart;

  // UNIFIED BOOST OFF -> Stop Boost, Stop VPN Firewall, Restore DND, Unlock Route & Clear Countdown
  const stopSuperBoost = async () => {
    if (boostTransitionLockRef.current || superBoost.status === 'stopping') return;
    boostTransitionLockRef.current = true;
    try {
      haptics.boostStop();
      sound.playToggle(false);
      setIsBoostDetailsOpen(false);
      setBoostDetailsSummary(null);

      setSuperBoost((prev) => ({
        ...prev,
        status: 'stopping',
        currentStepLabel: 'Stopping Boost, VPN Firewall & session rules...',
      }));

      if (smartSession.isActive || superBoost.status === 'active') {
        const samples = smartSession.fpsSamples.length > 0 ? smartSession.fpsSamples : [state.currentFps];
        const avgFps = Math.round(samples.reduce((s, v) => s + v, 0) / samples.length);
        const report: PerformanceReportItem = {
          id: `PERF_${Date.now().toString(36)}`,
          userId,
          gameName: smartSession.gameName || superBoost.selectedGameName || 'Super Boost Session',
          profileMode: smartSession.profileUsed || state.activeProfile,
          avgFps,
          minFps: Math.min(...samples),
          maxFps: Math.max(...samples),
          avgPingMs: activeRegion.currentPingMs,
          packetLossPercent: networkDiagnostics.packetLossPercent,
          peakTempC: Math.max(smartSession.peakTempC, state.temperatureC),
          blockedAppsCount: appsList.filter((a) => a.isBlocked).length,
          durationSec: (superBoost.startedAt || smartSession.startedAt)
            ? Math.max(1, Math.round((Date.now() - (superBoost.startedAt || smartSession.startedAt || Date.now())) / 1000))
            : 30,
          createdAt: Date.now(),
        };
        setPerformanceReports((prev) => [report, ...prev.slice(0, 9)]);
        await savePerformanceReportToFirestore(report);
      }

      // Restore pre-session block rules if modified, restore DND, unlock route & stop VPN tunnel
      if (firewallState.previousSnapshotBlockedIds) {
        const prevBlockedSet = new Set(firewallState.previousSnapshotBlockedIds);
        setAppsList(prev => prev.map(app => ({ ...app, isBlocked: prevBlockedSet.has(app.id) })));
      }
      if (typeof window !== 'undefined') {
        (window as unknown as Record<string, unknown>)['__FPS_LOW_NETWORK_NOISE__'] = false;
      }
      await Promise.all([
        setNativeDndMode(false).catch(() => {}),
        syncFirewallRulesToNative(false, [], ''),
      ]);

      setSmartSession((prev) => ({ ...prev, isActive: false, completedSteps: [1, 2, 3, 4, 5, 6, 7, 8] }));
      setFirewallState((prev) => ({
        ...prev,
        enabled: false,
        persistentServiceRunning: false,
        wakeLockActive: false,
        heartbeatCount: 0,
        vpnLayer: 1,
        firewallLayer: 1,
        layerStatusNote: 'Dual-Stack Guard Ready',
        connectionState: 'READY',
        uptimeSec: 0,
        previousSnapshotEnabled: false,
      }));
      setNetworkDiagnostics((prev) => ({
        ...prev,
        isRouteLocked: false,
      }));
      setActiveGame(null);
      setState((prev) => ({
        ...prev,
        isGamingModeOn: false,
        isBoosting: false,
        isVpnActive: false,
        boostExpiresAtMs: null,
        activeSessionStartedAtMs: null,
        boostTimeRemainingSec: 0,
      }));
      setSuperBoost({
        status: 'idle',
        currentStepIndex: 0,
        currentStepLabel: 'Ready to optimize',
        completedSteps: [],
        startedAt: null,
        selectedGamePackage: selectedSuperBoostGamePkg,
        selectedGameName:
          gamesList.find((g) => g.packageName === selectedSuperBoostGamePkg)?.name || 'PUBG Mobile',
        errorMessage: null,
      });
      addRecoveryLog('session', 'info', 'Boost OFF: VPN Firewall stopped & normal networking restored.');
      setSnackBarMessage('BOOST OFF • VPN Stopped & Rules Restored');
      addLog('Boost OFF cleanly. VPN stopped & normal networking restored.');
    } finally {
      boostTransitionLockRef.current = false;
    }
  };
  stopSuperBoostRef.current = stopSuperBoost;

  const markOnboardingCompleteAndStart = async (gameObj: GameItem | null) => {
    try {
      localStorage.setItem('fps_booster_perms_onboarded_v1', '1');
    } catch {}
    setPermissionFlow((prev) => ({
      ...prev,
      isOpen: false,
      currentStep: null,
      stepsQueue: [],
      isRequesting: false,
      checklist: { ...prev.checklist, onboarded: true },
      pendingGame: null,
    }));
    await executeAtomicBoostStart(gameObj || undefined);
  };

  // Single Atomic Master Toggle: Checks Ad-Time Gate first, then first-time permissions (1 -> 2 -> 3), subsequent taps boost directly
  const handleToggleBoost = async (explicitGame?: GameItem) => {
    if (
      boostTransitionLockRef.current ||
      superBoost.status === 'activating' ||
      superBoost.status === 'stopping'
    ) {
      return;
    }

    if (masterBoostActive) {
      await stopSuperBoost();
      return;
    }

    // Ad-Time Gate: require active expiration countdown from watching a rewarded Ad
    const remainingTime = latestStateRef.current.boostTimeRemainingSec || 0;
    if (remainingTime <= 0) {
      haptics.warning();
      sound.playClick();
      setSnackBarMessage('Watch 1 Ad to unlock Boost Time!');
      setCurrentScreen('reward_ad');
      return;
    }

    const gameObj =
      explicitGame ||
      gamesList.find((g) => g.packageName === selectedSuperBoostGamePkg) ||
      gamesList[0];

    let isOnboarded = false;
    try {
      isOnboarded = localStorage.getItem('fps_booster_perms_onboarded_v1') === '1';
    } catch {}

    if (!isOnboarded) {
      if (isNativeAndroidRuntime()) {
        const nativeCheck = await queryNativePermissionChecklist();
        const missingSteps: PermissionFlowStep[] = [];
        if (!nativeCheck.batteryOptimizationIgnored) missingSteps.push('battery');
        if (!nativeCheck.usageAccessGranted) missingSteps.push('usage');
        if (!nativeCheck.dndAccessGranted) missingSteps.push('dnd');
        if (!nativeCheck.vpnGranted) missingSteps.push('vpn');

        if (missingSteps.length > 0) {
          haptics.impactLight();
          sound.playClick();
          setPermissionFlow({
            isOpen: true,
            currentStep: missingSteps[0],
            stepsQueue: missingSteps,
            checklist: { ...nativeCheck, onboarded: false },
            isRequesting: false,
            pendingGame: gameObj,
          });
          return;
        }
      } else {
        // First-time guided flow in Web preview (skips automatically from 2nd tap onward)
        haptics.impactLight();
        sound.playClick();
        setPermissionFlow({
          isOpen: true,
          currentStep: 'battery',
          stepsQueue: ['battery', 'usage', 'dnd'],
          checklist: {
            batteryOptimizationIgnored: false,
            usageAccessGranted: false,
            dndAccessGranted: false,
            notificationGranted: true,
            vpnGranted: false,
            onboarded: false,
          },
          isRequesting: false,
          pendingGame: gameObj,
        });
        return;
      }
    }

    await executeAtomicBoostStart(gameObj);
  };

  const handlePermissionFlowAllow = async () => {
    const step = permissionFlow.currentStep;
    if (!step || permissionFlow.isRequesting) return;

    haptics.impactMedium();
    sound.playClick();
    setPermissionFlow((prev) => ({ ...prev, isRequesting: true }));

    let updatedChecklist: PermissionChecklistState = { ...permissionFlow.checklist };

    if (isNativeAndroidRuntime()) {
      try {
        if (step === 'battery') {
          const res = await GamingFirewallNative.requestBatteryOptimization();
          updatedChecklist.batteryOptimizationIgnored = Boolean(res.granted);
        } else if (step === 'usage') {
          const res = await GamingFirewallNative.requestUsageAccess();
          updatedChecklist.usageAccessGranted = Boolean(res.granted);
        } else if (step === 'dnd') {
          const res = await GamingFirewallNative.requestDndAccess();
          updatedChecklist.dndAccessGranted = Boolean(res.granted);
        } else if (step === 'vpn') {
          const res = await GamingFirewallNative.requestVpnPermission();
          updatedChecklist.vpnGranted = Boolean(res.granted);
          setFirewallState((prev) => ({ ...prev, hasVpnPermission: Boolean(res.granted) }));
        }
        const refreshed = await queryNativePermissionChecklist();
        updatedChecklist = { ...refreshed, onboarded: false };
      } catch {
        // Proceed gracefully to next step if ROM blocks a specific settings intent
      }
    } else {
      if (step === 'battery') updatedChecklist.batteryOptimizationIgnored = true;
      if (step === 'usage') updatedChecklist.usageAccessGranted = true;
      if (step === 'dnd') updatedChecklist.dndAccessGranted = true;
      if (step === 'vpn') updatedChecklist.vpnGranted = true;
    }

    const currentIdx = permissionFlow.stepsQueue.indexOf(step);
    const nextStep =
      currentIdx >= 0 && currentIdx + 1 < permissionFlow.stepsQueue.length
        ? permissionFlow.stepsQueue[currentIdx + 1]
        : null;

    if (nextStep) {
      setPermissionFlow((prev) => ({
        ...prev,
        currentStep: nextStep,
        checklist: updatedChecklist,
        isRequesting: false,
      }));
    } else {
      await markOnboardingCompleteAndStart(permissionFlow.pendingGame);
    }
  };

  const skipPermissionFlowStep = () => {
    const step = permissionFlow.currentStep;
    if (!step) return;
    haptics.selection();
    sound.playClick();
    const currentIdx = permissionFlow.stepsQueue.indexOf(step);
    const nextStep =
      currentIdx >= 0 && currentIdx + 1 < permissionFlow.stepsQueue.length
        ? permissionFlow.stepsQueue[currentIdx + 1]
        : null;

    if (nextStep) {
      setPermissionFlow((prev) => ({
        ...prev,
        currentStep: nextStep,
        isRequesting: false,
      }));
    } else {
      markOnboardingCompleteAndStart(permissionFlow.pendingGame);
    }
  };

  const closePermissionFlow = () => {
    haptics.selection();
    sound.playClick();
    setPermissionFlow((prev) => ({
      ...prev,
      isOpen: false,
      currentStep: null,
      isRequesting: false,
    }));
  };

  // Explicit sequential permission request helper ('Ignore Battery Optimization' -> 'Usage Access' -> 'Notification Access')
  const requestSequentialBoostPermissions = async (): Promise<PermissionChecklistState> => {
    if (!isNativeAndroidRuntime()) {
      return {
        batteryOptimizationIgnored: true,
        usageAccessGranted: true,
        dndAccessGranted: true,
        notificationGranted: true,
        vpnGranted: false,
        onboarded: true,
      };
    }
    try {
      const check0 = await queryNativePermissionChecklist();
      if (!check0.batteryOptimizationIgnored) {
        await GamingFirewallNative.requestBatteryOptimization().catch(() => {});
      }
      if (!check0.usageAccessGranted) {
        await GamingFirewallNative.requestUsageAccess().catch(() => {});
      }
      if (!check0.dndAccessGranted) {
        await GamingFirewallNative.requestDndAccess().catch(() => {});
      }
      if (!check0.notificationGranted) {
        await GamingFirewallNative.requestNotificationPermission().catch(() => {});
      }
      const finalCheck = await queryNativePermissionChecklist();
      return { ...finalCheck, onboarded: true };
    } catch {
      return permissionFlow.checklist;
    }
  };

  const activateSuperBoost = handleToggleBoost;

  // Backwards-compatible wrapper routing Game Launcher through unified Super Boost (respecting Ad-Time Gate)
  const launchGameWithAutoBoost = async (game: GameItem) => {
    markGamePlayed(game.packageName);
    setSelectedSuperBoostGamePkg(game.packageName);
    const remainingTime = latestStateRef.current.boostTimeRemainingSec || 0;
    if (!masterBoostActive && remainingTime <= 0) {
      setSnackBarMessage('Watch 1 Ad to unlock Boost Time!');
      setCurrentScreen('reward_ad');
      return;
    }
    await executeAtomicBoostStart(game);
    if (isNativeAndroidRuntime() && game.isInstalled) {
      await launchNativeGamePackage(game.packageName);
    }
    setCurrentScreen('dashboard');
  };

  const launchSelectedGame = async (game: GameItem) => {
    haptics.impactMedium();
    sound.playClick();
    markGamePlayed(game.packageName);
    setSelectedSuperBoostGamePkg(game.packageName);
    setActiveGame(game);
    setFirewallState(prev => ({
      ...prev,
      protectedGamePkg: game.packageName,
      protectedGameName: game.name,
    }));

    if (isNativeAndroidRuntime() && game.isInstalled) {
      const res = await launchNativeGamePackage(game.packageName);
      if (res.launched) {
        setSnackBarMessage(`Launching ${game.name} (${game.packageName})...`);
        addLog(`Launched installed game: ${game.name}`);
        return;
      }
    }
    setSnackBarMessage(`${game.name} Selected for Boost`);
    addLog(`Target game selected: ${game.name}`);
  };

  const installGameFromStore = async (game: GameItem) => {
    haptics.impactLight();
    sound.playClick();
    setSelectedSuperBoostGamePkg(game.packageName);
    setFirewallState(prev => ({
      ...prev,
      protectedGamePkg: game.packageName,
      protectedGameName: game.name,
    }));
    await openGameStorePage(game.packageName);
    setSnackBarMessage(`Opening Play Store for ${game.name}...`);
    addLog(`Opened store page for catalog game: ${game.name} (${game.packageName})`);
  };

  const stopGamingMode = async () => {
    await stopSuperBoost();
    setCurrentScreen('home');
  };

  // ONLINE FIRESTORE PAYMENT SUBMISSION WITH TASK 3 AUTO-MATCH OCR LOGIC
  const submitTransaction = async (data: {
    packageId: string;
    packageName: string;
    amount: number;
    method: PaymentMethodType;
    tid: string;
    senderName: string;
    phone: string;
    screenshotUrl?: string;
    screenshotName?: string;
    screenshotFile?: File;
  }): Promise<{ 
    success: boolean; 
    message: string; 
    isMatched?: boolean; 
    ocrTid?: string; 
    reason?: string 
  }> => {
    const trimmedTid = (data.tid || '').trim();

    // 1. PAYMENT SUBMIT VALIDATION:
    // User dega: Payment Method + TID + Payment Screenshot Upload
    // Agar TID khali ya Screenshot na ho to Error "TID aur Screenshot Zaroori Hai"
    if (!trimmedTid || (!data.screenshotUrl && !data.screenshotFile)) {
      sound.playClick();
      const err = 'TID aur Screenshot Zaroori Hai';
      setSnackBarMessage(err);
      return { success: false, message: err, reason: 'missing_fields' };
    }

    if (trimmedTid.length < 4) {
      sound.playClick();
      const err = 'Invalid TID: Please enter valid TID number';
      setSnackBarMessage(err);
      return { success: false, message: err, reason: 'invalid_tid' };
    }

    // Check duplicate TID
    const alreadyUsed = transactions.some(
      t => t.tid.toLowerCase() === trimmedTid.toLowerCase() && t.status === 'approved'
    );
    if (alreadyUsed) {
      sound.playClick();
      const err = 'This TID Already Used';
      setSnackBarMessage(err);
      return { success: false, message: err, reason: 'already_used' };
    }

    // Upload Screenshot to Firebase Storage if a file was provided
    let finalScreenshotUrl = data.screenshotUrl || '';
    if (data.screenshotFile) {
      const uploadRes = await uploadScreenshotToStorage(data.screenshotFile, userId);
      if (uploadRes.url) {
        finalScreenshotUrl = uploadRes.url;
      }
    }

    // 2. AUTO MATCH LOGIC:
    // Screenshot ko OCR / Text Recognition se scan karo aur usme se TID dhoondo.
    // User wali TID aur Screenshot wali TID ko compare karo (Space aur - hata ke).
    const imageSource = data.screenshotFile || finalScreenshotUrl;
    const ocrResult = await scanScreenshotForTid(imageSource, trimmedTid);

    const newTxId = `TX-${Date.now().toString(36).toUpperCase()}`;

    if (ocrResult.matched) {
      // CASE 1 - MATCH HO GAYA:
      // a) payments status = 'approved' + note = 'AUTO-MATCHED ✅'
      // b) users me isPro = true + proExpiry = 30 din baad
      // c) User ko dikhao "TID Matched! PRO Activated ✅"
      const proExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 din baad

      await submitPaymentToFirestore({
        id: newTxId,
        userId,
        name: data.senderName.trim() || 'Verified Gamer',
        packageName: data.packageName,
        amount: data.amount,
        method: data.method,
        tid: trimmedTid,
        screenshotUrl: finalScreenshotUrl,
        screenshotName: data.screenshotName,
        ocrTid: ocrResult.ocrTid,
        matchStatus: 'matched',
        note: 'AUTO-MATCHED ✅',
        status: 'approved',
      });

      await syncUserToFirestore({
        userId,
        name: data.senderName.trim() || 'Verified Gamer',
        isPro: true,
        proExpiry,
        activeFps: '120',
        boost: 'Done'
      });

      setState(prev => ({
        ...prev,
        isPro: true,
        proTier: 'month',
        proExpiresAt: proExpiry,
        activeFps: '120',
        isBoosting: true,
        boostTimeRemainingSec: 7200,
        boostDurationTotalSec: 7200,
      }));

      sound.playSuccess();
      const msg = 'TID Matched! PRO Activated ✅';
      setUserPaymentNotification({
        message: msg,
        type: 'success'
      });
      setSnackBarMessage(msg);
      addLog(`CLOUD SYNC: Verification record ${trimmedTid} logged.`);

      return {
        success: true,
        isMatched: true,
        ocrTid: ocrResult.ocrTid,
        message: msg,
      };
    } else {
      await submitPaymentToFirestore({
        id: newTxId,
        userId,
        name: data.senderName.trim() || 'Gamer',
        packageName: data.packageName,
        amount: data.amount,
        method: data.method,
        tid: trimmedTid,
        screenshotUrl: finalScreenshotUrl,
        screenshotName: data.screenshotName,
        ocrTid: ocrResult.ocrTid || 'Not Detected',
        matchStatus: 'manual_needed',
        note: 'MANUAL CHECK NEEDED',
        status: 'pending',
      });

      setState(prev => ({
        ...prev,
        isPro: false,
      }));

      sound.playShield();
      const msg = 'Submitted for review';
      setUserPaymentNotification({
        message: msg,
        type: 'info'
      });
      setSnackBarMessage(msg);
      addLog(`RECORD LOGGED: ${trimmedTid}`);

      return {
        success: true,
        isMatched: false,
        ocrTid: ocrResult.ocrTid,
        message: msg,
      };
    }
  };

  const approveTransaction = (id: string) => {
    const target = transactions.find(t => t.id === id);
    if (!target) return;
    approvePaymentInFirestore(id, target.userId || userId, 30);
    sound.playSuccess();
    setSnackBarMessage('Record Approved');
    addLog(`ADMIN APPROVED: Record ${target.tid} updated in Firestore.`);
  };

  const rejectTransaction = (id: string, reason?: string) => {
    const target = transactions.find(t => t.id === id);
    rejectPaymentInFirestore(id, target?.userId || userId, reason || 'Verification declined');
    sound.playClick();
    setSnackBarMessage('Record Rejected');
    addLog(`ADMIN REJECTED: Record ${id} updated in Firestore.`);
  };

  const sendMoneyFromWallet = (mobileNumber: string, amount: number, note: string): boolean => {
    sound.playBoost();
    const transfer: AdminWalletTransfer = {
      id: `WT-${Date.now().toString(36).toUpperCase()}`,
      mobileNumber,
      amount,
      note: note || 'Log',
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setWalletTransfers(prev => [transfer, ...prev]);
    localStorage.setItem('fps_booster_wallet_transfers_v4', JSON.stringify([transfer, ...walletTransfers]));
    addLog(`DIAGNOSTIC LOG: Recorded entry ${note || mobileNumber}`);
    return true;
  };

  const clearPaymentNotification = () => {
    setUserPaymentNotification(null);
  };

  const activateProForTest = () => {
    sound.playReward();
    grantAdBoostTime(30, 1, '30 Min Free Boost');
  };

  const setLanguage = (lang: Language) => {
    sound.playClick();
    setState(prev => ({ ...prev, language: lang }));
  };

  const adminStats: AdminWalletStats = {
    totalEarningsPkr: 0,
    todayEarningsPkr: 0,
    weekEarningsPkr: 0,
    monthEarningsPkr: 0,
    totalProUsers: performanceReports.length,
    methodBreakdown: {
      jazzcash: { amount: 0, count: 0, currency: 'PKR' },
      easypaisa: { amount: 0, count: 0, currency: 'PKR' },
      binance: { amount: 0, count: 0, currency: 'USD' },
    },
  };

  return (
    <BoosterContext.Provider
      value={{
        state,
        currentScreen,
        setCurrentScreen,
        appsList,
        gamesList,
        packages: PACKAGES,
        adOptions: AD_OPTIONS,
        transactions,
        walletTransfers,
        adminStats,
        autoApproveEnabled,
        setAutoApproveEnabled,
        activeGame,
        logs,
        userId,
        userPaymentNotification,
        snackBarMessage,
        setSnackBarMessage,
        clearPaymentNotification,
        refreshInstalledPackages,
        isRefreshingPackages,
        catalogSource,
        favoriteGamePackages,
        recentGamePackages,
        toggleFavoriteGame,
        markGamePlayed,
        launchSelectedGame,
        installGameFromStore,
        resetAppBlockRules,
        serverRegions,
        selectedRegionId,
        activeRegion,
        isProbing,
        lastProbedTime,
        runPingProbe,
        selectPingRegion,
        networkDiagnostics,
        runFullNetworkDiagnostics,
        optimizeNetworkRoute,
        toggleAutoOptimizeNetwork,
        fpsHistory,
        applyOptimizationProfile,
        perGameProfiles,
        updatePerGameProfile,
        bottleneckReport,
        cloudBackend,
        syncCloudBackend,
        deviceCapabilities,
        displayInfo,
        redetectRefreshRate,
        performanceReports,
        crashDiagnostics,
        logCrashDiagnostic,
        submitManualPerformanceSnapshot,
        firewallState,
        toggleDnsFilter,
        toggleBlockAllNonSelected,
        requestFirewallVpnPermission,
        setProtectedGame,
        applyFirewallPreset,
        restorePreviousFirewallRules,
        smartSession,
        masterBoostActive,
        superBoost,
        selectedSuperBoostGamePkg,
        setSelectedSuperBoostGamePkg,
        recoveryHistory,
        handleToggleBoost,
        activateSuperBoost,
        stopSuperBoost,
        isBoostDetailsOpen,
        setIsBoostDetailsOpen,
        boostDetailsSummary,
        permissionFlow,
        handlePermissionFlowAllow,
        requestSequentialBoostPermissions,
        skipPermissionFlowStep,
        closePermissionFlow,
        thermalMonitor,
        refreshThermalTelemetry,
        setThermalAlertThreshold,
        toggleAutoCoolOnHighTemp,
        dismissThermalWarning,
        applyThermalCooldownProfile,
        setFpsMode,
        toggleAppBlock,
        toggleAllAppsBlock,
        toggleBatterySaver,
        cleanRam,
        refreshHardwareTelemetry,
        clearTemporaryCache,
        applyGraphicsSettings,
        updateSetting,
        launchGameWithAutoBoost,
        stopGamingMode,
        setBoostDurationPreset,
        grantAdBoostTime,
        unlockFpsWithAd,
        isFpsTierUnlocked,
        resetNetworkInterfaceAndRoute,
        submitTransaction,
        approveTransaction,
        rejectTransaction,
        sendMoneyFromWallet,
        activateProForTest,
        setLanguage,
      }}
    >
      {children}
    </BoosterContext.Provider>
  );
};

export const useBooster = () => {
  const context = useContext(BoosterContext);
  if (!context) {
    throw new Error('useBooster must be used within a BoosterProvider');
  }
  return context;
};
