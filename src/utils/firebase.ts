import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  getDocFromServer
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  PaymentMethodType,
  CloudRemoteConfig,
  RemoteOptimizationProfileSpec,
  OptimizationProfileMode,
  CrashDiagnosticItem,
  PerformanceReportItem,
  DeviceCapabilitiesState
} from '../types.ts';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with firestoreDatabaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  silent: boolean = false
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  if (!silent) {
    throw new Error(JSON.stringify(errInfo));
  }
  return errInfo;
}

// Genuine Server Connection & Latency Check (uses getDocFromServer — never faked)
export async function measureFirestoreConnection(): Promise<{
  status: 'connected' | 'offline_cache' | 'error';
  rttMs: number | null;
  errorMessage?: string;
}> {
  const startedAt = performance.now();
  try {
    const snap = await getDocFromServer(doc(db, 'test', 'connection'));
    const rttMs = Math.max(1, Math.round(performance.now() - startedAt));
    if (snap.metadata.fromCache) {
      return { status: 'offline_cache', rttMs };
    }
    return { status: 'connected', rttMs };
  } catch (error) {
    const rttMs = Math.max(1, Math.round(performance.now() - startedAt));
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      // Server responded with a live rule decision — server reachability is real even if doc isn't readable
      return { status: 'connected', rttMs };
    }
    if (msg.includes('client is offline') || msg.includes('unavailable') || msg.includes('network')) {
      return { status: 'offline_cache', rttMs: null, errorMessage: 'Server unreachable (offline/cache mode)' };
    }
    return { status: 'error', rttMs: null, errorMessage: msg };
  }
}

// Upload screenshot using Firebase Storage with base64 DataURL fallback
export async function uploadScreenshotToStorage(
  file: File,
  userId: string
): Promise<{ url: string; storageType: 'cloud' | 'data' }> {
  try {
    const filename = `payments/${userId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const fileRef = storageRef(storage, filename);
    const snapshot = await uploadBytes(fileRef, file, {
      contentType: file.type || 'image/png',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return { url: downloadUrl, storageType: 'cloud' };
  } catch {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ url: (reader.result as string) || '', storageType: 'data' });
      };
      reader.onerror = () => {
        resolve({ url: '', storageType: 'data' });
      };
      reader.readAsDataURL(file);
    });
  }
}

// 1. Firebase Anonymous Auth - Auto UID without manual login
export async function ensureAnonymousAuth(): Promise<FirebaseUser | null> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.warn('Anonymous auth initialization:', err);
    return null;
  }
}

// 2. Firestore Sync: Save / Update User Profile cleanly under hardened rules
export async function syncUserToFirestore(userData: {
  userId: string;
  name?: string;
  isPro?: boolean;
  proExpiry?: number | null;
  activeFps?: string;
  activeProfile?: OptimizationProfileMode;
  totalBoostTime?: number;
  boost?: string;
  time?: string;
}) {
  const path = `users/${userData.userId}`;
  try {
    const userRef = doc(db, 'users', userData.userId);
    const currentTime = userData.time || new Date().toLocaleString();
    const existingSnap = await getDoc(userRef);

    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        name: (userData.name || 'Gamer').slice(0, 64),
        deviceId: userData.userId,
        isPro: userData.isPro ?? false,
        proExpiry: userData.proExpiry ?? null,
        totalBoostTime: userData.totalBoostTime ?? 0,
        activeFps: (userData.activeFps as '60' | '90' | '120') ?? '60',
        activeProfile: userData.activeProfile ?? 'SMART_BOOST',
        lastBoostTime: currentTime,
        boost: userData.boost || 'Ready',
        time: currentTime,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
      });
    } else {
      const payload: Record<string, unknown> = {
        name: (userData.name || existingSnap.data().name || 'Gamer').slice(0, 64),
        activeFps: userData.activeFps ?? existingSnap.data().activeFps ?? '60',
        activeProfile: userData.activeProfile ?? existingSnap.data().activeProfile ?? 'SMART_BOOST',
        lastBoostTime: currentTime,
        boost: userData.boost || 'Done',
        time: currentTime,
        updatedAt: Date.now(),
      };
      if (userData.totalBoostTime !== undefined) {
        payload.totalBoostTime = userData.totalBoostTime;
      }
      if (userData.isPro !== undefined) {
        payload.isPro = userData.isPro;
      }
      if (userData.proExpiry !== undefined) {
        payload.proExpiry = userData.proExpiry;
      }
      await updateDoc(userRef, payload);
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path, true);
  }
}

// 3. Firestore Sync: Submit Payment
export async function submitPaymentToFirestore(payment: {
  id: string;
  userId: string;
  name: string;
  packageName: string;
  amount: number;
  method: PaymentMethodType;
  tid: string;
  screenshotUrl?: string;
  screenshotName?: string;
  ocrTid?: string;
  matchStatus?: 'matched' | 'mismatch' | 'manual_needed';
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
}) {
  const path = `payments/${payment.id}`;
  try {
    const paymentRef = doc(db, 'payments', payment.id);
    await setDoc(paymentRef, {
      id: payment.id,
      userId: payment.userId,
      name: (payment.name || 'Verified Gamer').slice(0, 64),
      packageName: payment.packageName.slice(0, 64),
      amount: payment.amount,
      method: payment.method,
      tid: payment.tid.slice(0, 64),
      screenshotUrl: (payment.screenshotUrl || '').slice(0, 900000),
      screenshotName: (payment.screenshotName || '').slice(0, 128),
      ocrTid: (payment.ocrTid || '').slice(0, 64),
      matchStatus: payment.matchStatus || 'manual_needed',
      note: (payment.note || '').slice(0, 128),
      status: payment.status,
      createdAt: Date.now(),
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, path);
  }
}

// 4. Firestore Sync: Admin Approves Payment & activates User PRO in Firestore
export async function approvePaymentInFirestore(paymentId: string, userId: string, proDays: number = 30) {
  const path = `payments/${paymentId}`;
  const reviewedAt = Date.now();
  try {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, {
      status: 'approved',
      note: 'ADMIN APPROVED ✅',
      reviewedAt,
    });

    if (userId) {
      const userRef = doc(db, 'users', userId);
      const expiryTimestamp = Date.now() + proDays * 24 * 60 * 60 * 1000;
      await setDoc(
        userRef,
        {
          isPro: true,
          proExpiry: expiryTimestamp,
          activeFps: '120',
          updatedAt: reviewedAt,
        },
        { merge: true }
      );
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, path, true);
  }
}

// 5. Firestore Sync: Admin Rejects Payment
export async function rejectPaymentInFirestore(paymentId: string, userId?: string, reason?: string) {
  const path = `payments/${paymentId}`;
  const reviewedAt = Date.now();
  try {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, {
      status: 'rejected',
      rejectReason: (reason || 'Transaction verification failed').slice(0, 200),
      note: 'REJECTED ❌',
      reviewedAt,
    });

    if (userId) {
      const userRef = doc(db, 'users', userId);
      await setDoc(
        userRef,
        {
          isPro: false,
          updatedAt: reviewedAt,
        },
        { merge: true }
      );
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, path, true);
  }
}

// 6. Remote Cloud Config Sync (/cloudConfig/global)
export async function fetchRemoteCloudConfig(): Promise<CloudRemoteConfig | null> {
  const path = 'cloudConfig/global';
  try {
    const snap = await getDocFromServer(doc(db, 'cloudConfig', 'global'));
    if (snap.exists()) {
      const d = snap.data();
      return {
        configVersion: d.configVersion || 'v3.2.0',
        minAppVersion: d.minAppVersion || '2.4.0',
        serviceStatus: d.serviceStatus || 'operational',
        updateTitle: d.updateTitle || '',
        updateMessage: d.updateMessage || '',
        hasImportantUpdate: Boolean(d.hasImportantUpdate),
        telemetryEnabled: d.telemetryEnabled !== false,
        updatedAt: d.updatedAt || Date.now(),
      };
    }
    return null;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, path, true);
    return null;
  }
}

// 7. Remote Optimization Profiles Sync (/optimizationProfiles)
export async function fetchRemoteOptimizationProfiles(): Promise<RemoteOptimizationProfileSpec[]> {
  const path = 'optimizationProfiles';
  try {
    const q = query(collection(db, 'optimizationProfiles'));
    const snap = await getDocs(q);
    const items: RemoteOptimizationProfileSpec[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.id && d.name && d.targetFps) {
        items.push({
          id: d.id as OptimizationProfileMode,
          name: String(d.name),
          description: String(d.description || ''),
          targetFps: d.targetFps as '60' | '90' | '120',
          performanceMode: Boolean(d.performanceMode),
          reduceLag: Boolean(d.reduceLag),
          improveRendering: Boolean(d.improveRendering),
          graphicsOptimized: Boolean(d.graphicsOptimized),
          thermalCapC: Number(d.thermalCapC || 43),
        });
      }
    });
    return items;
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, path, true);
    return [];
  }
}

// 8. Device Compatibility Sync (/deviceProfiles/{userId})
export async function syncDeviceCompatibilityToFirestore(
  userId: string,
  caps: DeviceCapabilitiesState,
  totalRamGb: number,
  recommendedProfile: OptimizationProfileMode
): Promise<'FLAGSHIP' | 'COMPETITIVE' | 'STANDARD' | 'WEB_PREVIEW'> {
  const tier: 'FLAGSHIP' | 'COMPETITIVE' | 'STANDARD' | 'WEB_PREVIEW' = !caps.isNativeAndroid
    ? 'WEB_PREVIEW'
    : caps.maxRefreshHz >= 120 && totalRamGb >= 6
    ? 'FLAGSHIP'
    : caps.maxRefreshHz >= 90 || totalRamGb >= 4
    ? 'COMPETITIVE'
    : 'STANDARD';

  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `deviceProfiles/${safeId}`;
  try {
    const ref = doc(db, 'deviceProfiles', safeId);
    await setDoc(
      ref,
      {
        deviceId: safeId,
        deviceName: (caps.deviceModel || 'Web Preview Browser').slice(0, 128),
        maxSupportedHz: Math.min(240, Math.max(30, Math.round(caps.maxRefreshHz || 60))),
        totalRamGb: Math.max(1, Math.min(128, Number(totalRamGb.toFixed(1)))),
        adpfSupported: caps.adpfSupported,
        gameModeApiSupported: caps.gameModeApiSupported,
        vpnFirewallSupported: caps.vpnFirewallSupported,
        recommendedProfile,
        compatibilityTier: tier,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path, true);
  }
  return tier;
}

// 9. Crash Diagnostics Reporter (/crashReports/{id})
export async function reportCrashToFirestore(report: CrashDiagnosticItem): Promise<boolean> {
  if (!auth.currentUser) return false;
  const safeId = report.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const path = `crashReports/${safeId}`;
  try {
    await setDoc(doc(db, 'crashReports', safeId), {
      id: safeId,
      userId: auth.currentUser.uid,
      message: (report.message || 'Unknown error').slice(0, 500),
      stack: (report.stack || '').slice(0, 2000),
      screen: (report.screen || 'unknown').slice(0, 48),
      platform: (report.platform || 'web').slice(0, 32),
      appVersion: (report.appVersion || 'v3.2').slice(0, 32),
      createdAt: report.createdAt || Date.now(),
    });
    return true;
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, path, true);
    return false;
  }
}

// 10. Gaming Session Performance Reports (/performanceReports/{id})
export async function savePerformanceReportToFirestore(report: PerformanceReportItem): Promise<boolean> {
  if (!auth.currentUser) return false;
  const safeId = report.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const path = `performanceReports/${safeId}`;
  try {
    await setDoc(doc(db, 'performanceReports', safeId), {
      id: safeId,
      userId: auth.currentUser.uid,
      gameName: report.gameName.slice(0, 80),
      profileMode: report.profileMode,
      avgFps: Math.max(0, Math.min(240, Math.round(report.avgFps))),
      minFps: Math.max(0, Math.min(240, Math.round(report.minFps))),
      maxFps: Math.max(0, Math.min(240, Math.round(report.maxFps))),
      avgPingMs: Math.max(0, Math.min(5000, Math.round(report.avgPingMs))),
      packetLossPercent: Math.max(0, Math.min(100, Number(report.packetLossPercent.toFixed(1)))),
      peakTempC: Math.max(0, Math.min(120, Number(report.peakTempC.toFixed(1)))),
      blockedAppsCount: Math.max(0, Math.min(500, Math.round(report.blockedAppsCount))),
      durationSec: Math.max(0, Math.min(86400, Math.round(report.durationSec))),
      createdAt: report.createdAt || Date.now(),
    });
    return true;
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, path, true);
    return false;
  }
}

export async function fetchUserPerformanceReports(userId: string): Promise<PerformanceReportItem[]> {
  if (!auth.currentUser) return [];
  const path = 'performanceReports';
  try {
    const q = query(collection(db, 'performanceReports'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const items: PerformanceReportItem[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      items.push({
        id: d.id || docSnap.id,
        userId: d.userId,
        gameName: d.gameName || 'Gaming Session',
        profileMode: d.profileMode || 'SMART_BOOST',
        avgFps: Number(d.avgFps || 60),
        minFps: Number(d.minFps || 55),
        maxFps: Number(d.maxFps || 60),
        avgPingMs: Number(d.avgPingMs || 58),
        packetLossPercent: Number(d.packetLossPercent || 0),
        peakTempC: Number(d.peakTempC || 35),
        blockedAppsCount: Number(d.blockedAppsCount || 0),
        durationSec: Number(d.durationSec || 60),
        createdAt: Number(d.createdAt || Date.now()),
      });
    });
    return items.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, path, true);
    return [];
  }
}
