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
// çalışma zamanında mevcut. require başarısız olsa bile açılış çökmemeli.
let getReactNativePersistence:
  | ((storage: typeof AsyncStorage) => unknown)
  | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ({ getReactNativePersistence } = require('firebase/auth'));
} catch {
  // Yok sayılır; kalıcılık olmadan (in-memory) devam edilir.
}

export const firebaseReady = isFirebaseConfigured();

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

if (firebaseReady) {
  // Tüm başlatma korumalı: modül yükleme anında hiçbir hata uygulamayı
  // çökertmemeli (instances undefined kalır, require* anlamlı hata verir).
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig as Record<string, string>);

    try {
      // RN'de oturumun kalıcı olması için AsyncStorage tabanlı kalıcılık.
      authInstance = getReactNativePersistence
        ? initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage) as never,
          })
        : getAuth(app);
    } catch {
      // Hızlı yenilemede (Fast Refresh) zaten başlatılmış olabilir.
      authInstance = getAuth(app);
    }

    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);
  } catch (error) {
    console.error('[firebase] başlatma hatası', error);
  }
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
