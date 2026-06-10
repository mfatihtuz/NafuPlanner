import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  // getReactNativePersistence, derleme türlerinde her sürümde görünmeyebilir;
  // çalışma zamanında 'firebase/auth' içinden gelir. Aşağıda güvenli erişim.
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

import { firebaseConfig, isFirebaseConfigured } from '@/config/env';

// `getReactNativePersistence` bazı sürümlerin tip tanımlarında yer almıyor;
// çalışma zamanında mevcut. Güvenli şekilde alıyoruz.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => unknown;
};

export const firebaseReady = isFirebaseConfigured();

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

if (firebaseReady) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig as Record<string, string>);

  try {
    authInstance = initializeAuth(app, {
      // RN'de oturumun kalıcı olması için AsyncStorage tabanlı kalıcılık.
      persistence: getReactNativePersistence(AsyncStorage) as never,
    });
  } catch {
    // Hızlı yenilemede (Fast Refresh) zaten başlatılmış olabilir.
    authInstance = getAuth(app);
  }

  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
}

export const firebaseApp = app;
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;

/** Firebase hazır değilse anlamlı hata fırlatan güvenli erişimciler. */
export function requireAuth(): Auth {
  if (!authInstance) {
    throw new Error('Firebase yapılandırması eksik (.env). Auth kullanılamıyor.');
  }
  return authInstance;
}

export function requireDb(): Firestore {
  if (!dbInstance) {
    throw new Error('Firebase yapılandırması eksik (.env). Firestore kullanılamıyor.');
  }
  return dbInstance;
}

export function requireStorage(): FirebaseStorage {
  if (!storageInstance) {
    throw new Error('Firebase yapılandırması eksik (.env). Storage kullanılamıyor.');
  }
  return storageInstance;
}
