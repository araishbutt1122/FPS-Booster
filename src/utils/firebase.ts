import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { TransactionProof, PaymentMethodType } from '../types.ts';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: The app must initialize Firestore with firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Test Firestore Connection as required by Firestore integration skill
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase is connecting or operating with cache.');
    }
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
    console.log('Screenshot successfully uploaded to Firebase Storage:', downloadUrl);
    return { url: downloadUrl, storageType: 'cloud' };
  } catch (storageError) {
    console.warn('Firebase Storage direct upload skipped/failed, falling back to base64 data URI:', storageError);
    // Reliable base64 fallback so user transaction is never blocked
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

// 2. Firestore Sync: Save / Update User Profile
export async function syncUserToFirestore(userData: {
  userId: string;
  name?: string;
  isPro?: boolean;
  proExpiry?: number | null;
  activeFps?: string;
  totalBoostTime?: number;
  boost?: string;
  time?: string;
}) {
  try {
    const userRef = doc(db, 'users', userData.userId);
    const currentTime = userData.time || new Date().toLocaleString();
    await setDoc(userRef, {
      name: userData.name || 'Test User',
      boost: userData.boost || 'Done',
      time: currentTime,
      deviceId: userData.userId,
      isPro: userData.isPro ?? false,
      proExpiry: userData.proExpiry ?? null,
      activeFps: userData.activeFps ?? '120',
      lastBoostTime: currentTime,
      updatedAt: Date.now()
    }, { merge: true });
    console.log('Data Save Ho Gaya');
  } catch (e) {
    console.error('Error syncing user to Firestore:', e);
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
  const paymentRef = doc(db, 'payments', payment.id);
  await setDoc(paymentRef, {
    id: payment.id,
    userId: payment.userId,
    name: payment.name,
    packageName: payment.packageName,
    amount: payment.amount,
    method: payment.method,
    tid: payment.tid,
    screenshotUrl: payment.screenshotUrl || '',
    screenshotName: payment.screenshotName || '',
    ocrTid: payment.ocrTid || '',
    matchStatus: payment.matchStatus || 'manual_needed',
    note: payment.note || '',
    status: payment.status,
    createdAt: Date.now(),
  });
  console.log('Payment saved to Firestore /payments collection:', payment.id, payment.status, payment.note);
}

// 4. Firestore Sync: Admin Approves Payment & activates User PRO in Firestore
export async function approvePaymentInFirestore(paymentId: string, userId: string, proDays: number = 30) {
  const paymentRef = doc(db, 'payments', paymentId);
  const reviewedAt = Date.now();
  await updateDoc(paymentRef, {
    status: 'approved',
    note: 'ADMIN APPROVED ✅',
    reviewedAt
  });

  if (userId) {
    const userRef = doc(db, 'users', userId);
    const expiryTimestamp = Date.now() + proDays * 24 * 60 * 60 * 1000;
    await setDoc(userRef, {
      isPro: true,
      proExpiry: expiryTimestamp,
      activeFps: '120',
      updatedAt: reviewedAt
    }, { merge: true });
  }
  console.log(`Payment ${paymentId} approved and user ${userId} PRO activated in Firestore.`);
}

// 5. Firestore Sync: Admin Rejects Payment
export async function rejectPaymentInFirestore(paymentId: string, userId?: string, reason?: string) {
  const paymentRef = doc(db, 'payments', paymentId);
  const reviewedAt = Date.now();
  await updateDoc(paymentRef, {
    status: 'rejected',
    rejectReason: reason || 'Transaction verification failed',
    note: 'REJECTED ❌',
    reviewedAt
  });

  if (userId) {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      isPro: false,
      updatedAt: reviewedAt
    }, { merge: true });
  }
  console.log(`Payment ${paymentId} marked as rejected in Firestore.`);
}
