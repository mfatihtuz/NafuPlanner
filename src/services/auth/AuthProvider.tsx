import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';

import { googleAuthConfig, isGoogleAuthConfigured } from '@/config/env';
import { t } from '@/i18n';
import { auth, firebaseReady } from '@/services/firebase/config';

// Native Google Sign-In modülü yalnız derlenmiş uygulamada bulunur; Expo Go'da
// yoksa require başarısız olur ve Google girişi sessizce gizlenir (e-posta/Apple
// girişi çalışmaya devam eder).
type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');
let GoogleSignin: GoogleSigninModule['GoogleSignin'] | undefined;
let googleStatusCodes: GoogleSigninModule['statusCodes'] | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  GoogleSignin = mod.GoogleSignin;
  googleStatusCodes = mod.statusCodes;
} catch {
  // Modül yok (Expo Go) — Google girişi devre dışı kalır.
}

let googleConfigured = false;
function ensureGoogleConfigured() {
  if (googleConfigured || !GoogleSignin || !isGoogleAuthConfigured()) return;
  GoogleSignin.configure({
    webClientId: googleAuthConfig.webClientId,
    iosClientId: googleAuthConfig.iosClientId,
  });
  googleConfigured = true;
}

interface AuthContextValue {
  user: FirebaseUser | null;
  /** İlk oturum durumu çözülene kadar true. */
  initializing: boolean;
  signingIn: boolean;
  /** Firebase + Google yapılandırması hazır mı? */
  canSignIn: boolean;
  signInWithGoogle: () => Promise<void>;
  /** Apple ile giriş (yalnızca iOS; App Store zorunluluğu). */
  signInWithApple: () => Promise<void>;
  /**
   * Expo Go'da test için e-posta/şifre girişi. Hesap yoksa oluşturur. Yalnızca
   * geliştirme/test amaçlıdır; üretim akışı Google/Apple ile giriştir.
   */
  signInWithEmail: (name: string, email: string, password: string) => Promise<void>;
  /** Görünen adı günceller (Auth profili; üyelik belgesi ayrıca güncellenir). */
  updateDisplayName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Hesabı kalıcı siler (App Store 5.1.1 zorunluluğu). Yakın zamanda giriş
   * gerekiyorsa 'requires-recent-login' fırlatır; arayüz yönlendirir.
   */
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  // Firebase yapılandırılmadıysa beklenecek bir oturum yok → başlangıçta hazır.
  const [initializing, setInitializing] = useState(firebaseReady);
  const [signingIn, setSigningIn] = useState(false);

  const canSignIn = firebaseReady && Boolean(GoogleSignin) && isGoogleAuthConfigured();

  // Native Google Sign-In'ı yapılandır (modül + client id mevcutsa).
  useEffect(() => {
    ensureGoogleConfigured();
  }, []);

  // Firebase oturum durumunu dinle (yalnızca yapılandırma hazırsa).
  useEffect(() => {
    if (!firebaseReady || !auth) return;
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseReady || !auth || !GoogleSignin) {
      Alert.alert(t('auth.configMissingTitle'), t('auth.configMissing'));
      return;
    }
    try {
      setSigningIn(true);
      ensureGoogleConfigured();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      // v13+ biçimi: { type: 'success', data } | { type: 'cancelled' };
      // eski sürümler doğrudan kullanıcıyı döndürür. İkisini de destekle.
      if ((response as { type?: string }).type === 'cancelled') return;
      const idToken =
        (response as { data?: { idToken?: string | null } }).data?.idToken ??
        (response as { idToken?: string | null }).idToken;
      if (!idToken) {
        console.warn('[auth] Google: idToken alınamadı', response);
        Alert.alert(t('common.appName'), t('auth.signInError'));
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (
        googleStatusCodes &&
        (code === googleStatusCodes.SIGN_IN_CANCELLED || code === googleStatusCodes.IN_PROGRESS)
      ) {
        return; // kullanıcı vazgeçti / giriş zaten sürüyor
      }
      console.warn('[auth] Google ile giriş başarısız', error);
      Alert.alert(t('common.appName'), t('auth.signInError'));
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    if (!firebaseReady || !auth) {
      Alert.alert(t('auth.configMissingTitle'), t('auth.configMissing'));
      return;
    }
    try {
      setSigningIn(true);
      // Tekrar-oynatma koruması: ham nonce Apple'a SHA256 özetiyle gider,
      // Firebase'e ham hali verilir.
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) throw new Error('identityToken yok');

      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({
        idToken: credential.identityToken,
        rawNonce,
      });
      const result = await signInWithCredential(auth, firebaseCredential);

      // Apple ad bilgisini YALNIZCA ilk girişte verir; profilde yoksa yaz.
      const fullName = credential.fullName;
      const composedName = [fullName?.givenName, fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (composedName && !result.user.displayName) {
        await updateProfile(result.user, { displayName: composedName });
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ERR_REQUEST_CANCELED') return; // kullanıcı vazgeçti
      console.warn('[auth] Apple ile giriş başarısız', error);
      Alert.alert(t('common.appName'), t('auth.signInError'));
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signInWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      if (!firebaseReady || !auth) {
        Alert.alert(t('auth.configMissingTitle'), t('auth.configMissing'));
        return;
      }
      const mail = email.trim().toLowerCase();
      try {
        setSigningIn(true);
        try {
          await signInWithEmailAndPassword(auth, mail, password);
        } catch (error) {
          const code = (error as { code?: string }).code;
          // Hesap yoksa oluştur. (Yeni Firebase sürümleri kullanıcı yoksa da
          // 'invalid-credential' döndürebilir.)
          if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
            try {
              const cred = await createUserWithEmailAndPassword(auth, mail, password);
              if (name.trim()) {
                await updateProfile(cred.user, { displayName: name.trim() });
                // Güncel adın oturuma yansıması için yeniden giriş yap.
                await signInWithEmailAndPassword(auth, mail, password);
              }
            } catch (createError) {
              if ((createError as { code?: string }).code === 'auth/email-already-in-use') {
                Alert.alert(t('common.appName'), t('auth.devWrongPassword'));
                return;
              }
              throw createError;
            }
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.warn('[auth] e-posta ile giriş başarısız', error);
        // Sık karşılaşılan hataları net mesajlara çevir (tahmin gerektirmesin).
        const code = (error as { code?: string }).code;
        const message =
          code === 'auth/operation-not-allowed'
            ? t('auth.errEmailNotEnabled')
            : code === 'auth/weak-password'
              ? t('auth.errWeakPassword')
              : code === 'auth/invalid-email'
                ? t('auth.errInvalidEmail')
                : t('auth.devSignInError');
        Alert.alert(t('common.appName'), message);
      } finally {
        setSigningIn(false);
      }
    },
    [],
  );

  const updateDisplayName = useCallback(async (name: string) => {
    const current = auth?.currentUser;
    if (!current) return;
    await updateProfile(current, { displayName: name.trim() });
    // React'in değişikliği görmesi için yeni bir referans üret (Firebase User
    // nesnesi yerinde değiştiği için aynı referansla yeniden render olmaz).
    setUser(
      Object.assign(Object.create(Object.getPrototypeOf(current)), current) as FirebaseUser,
    );
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!auth?.currentUser) return;
    await deleteUser(auth.currentUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      signingIn,
      canSignIn,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      updateDisplayName,
      signOut,
      deleteAccount,
    }),
    [
      user,
      initializing,
      signingIn,
      canSignIn,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      updateDisplayName,
      signOut,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  }
  return ctx;
}
