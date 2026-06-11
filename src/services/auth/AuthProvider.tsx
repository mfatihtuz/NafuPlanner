import * as AppleAuthentication from 'expo-apple-authentication';
import type { AuthSessionResult } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
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

// OAuth yönlendirmesinden dönüşte tarayıcı oturumunu kapatır.
WebBrowser.maybeCompleteAuthSession();

type GooglePrompt = () => Promise<AuthSessionResult>;

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

  // ÖNEMLİ: Google.useAuthRequest, platforma ait client id undefined ise
  // render sırasında hata fırlatır (invariantClientId) ve release build'i
  // açılışta çökertir. Bu yüzden hook'u yalnızca yapılandırma varken mount
  // edilen GoogleSignInBridge'e taşıdık; prompt fonksiyonu state'e aktarılır.
  const [googlePrompt, setGooglePrompt] = useState<{ run: GooglePrompt } | null>(null);
  const handleGoogleReady = useCallback((run: GooglePrompt | null) => {
    setGooglePrompt(run ? { run } : null);
  }, []);

  const canSignIn = firebaseReady && googlePrompt != null;

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
    if (!firebaseReady || !auth || !googlePrompt) {
      Alert.alert(t('auth.configMissingTitle'), t('auth.configMissing'));
      return;
    }
    try {
      setSigningIn(true);
      const result = await googlePrompt.run();
      if (result.type !== 'success') return;

      const idToken =
        result.authentication?.idToken ??
        (result.params?.id_token as string | undefined);
      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      }
    } catch (error) {
      console.warn('[auth] Google ile giriş başarısız', error);
      Alert.alert(t('common.appName'), t('auth.signInError'));
    } finally {
      setSigningIn(false);
    }
  }, [googlePrompt]);

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
      signOut,
      deleteAccount,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {isGoogleAuthConfigured() ? <GoogleSignInBridge onReady={handleGoogleReady} /> : null}
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Google auth hook'unu izole eden köprü. Yalnızca yapılandırma mevcutken
 * mount edilir; prompt fonksiyonunu üst bileşene geri verir. Böylece client id
 * yokken useAuthRequest hiç çağrılmaz (açılış çökmesi engellenir).
 */
function GoogleSignInBridge({ onReady }: { onReady: (run: GooglePrompt | null) => void }) {
  const [request, , promptAsync] = Google.useAuthRequest({
    webClientId: googleAuthConfig.webClientId,
    iosClientId: googleAuthConfig.iosClientId,
    androidClientId: googleAuthConfig.androidClientId,
  });
  useEffect(() => {
    onReady(request ? () => promptAsync() : null);
    return () => onReady(null);
  }, [request, promptAsync, onReady]);
  return null;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  }
  return ctx;
}
