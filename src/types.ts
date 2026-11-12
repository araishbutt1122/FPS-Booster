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

export interface BoosterState {
  isGamingModeOn: boolean;
  isVpnActive: boolean;
  activeFps: FPSMode;
  currentFps: number;
  maxHardwareHz: number;
  ramUsagePercent: number;
  ramUsedGb: number;
  totalRamGb: number;
  temperatureC: number;
  batteryLevel: number;
  isBatteryCharging?: boolean;
  pingMs: number;
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
}
