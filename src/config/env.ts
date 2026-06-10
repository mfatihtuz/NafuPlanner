/**
 * Ortam değişkenleri erişimi. EXPO_PUBLIC_ önekli değişkenler Expo tarafından
 * derleme anında gömülür. Eksik olabilecekleri için her şey opsiyonel kabul
 * edilir; uygulama yapılandırma olmadan da açılır (giriş ekranı uygun uyarıyı
 * gösterir).
 */

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const googleAuthConfig = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};

/** Firebase'i başlatmak için minimum alanlar var mı? */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
  );
}

/** Google girişi için en azından bir client ID var mı? */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(
    googleAuthConfig.webClientId ||
      googleAuthConfig.iosClientId ||
      googleAuthConfig.androidClientId,
  );
}
