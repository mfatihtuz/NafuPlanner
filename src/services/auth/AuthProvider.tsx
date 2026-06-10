import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
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

interface AuthContextValue {
  user: FirebaseUser | null;
  /** İlk oturum durumu çözülene kadar true. */
  initializing: boolean;
  signingIn: boolean;
  /** Firebase + Google yapılandırması hazır mı? */
  canSignIn: boolean;
  signInWithGoogle: () => Promise<void>;
  /**
   * Expo Go'da test için e-posta/şifre girişi. Hesap yoksa oluşturur. Yalnızca
   * geliştirme/test amaçlıdır; üretim akışı Google ile giriştir.
   */
  signInWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  // Firebase yapılandırılmadıysa beklenecek bir oturum yok → başlangıçta hazır.
  const [initializing, setInitializing] = useState(firebaseReady);
  const [signingIn, setSigningIn] = useState(false);

  const [request, , promptAsync] = Google.useAuthRequest({
    webClientId: googleAuthConfig.webClientId,
    iosClientId: googleAuthConfig.iosClientId,
    androidClientId: googleAuthConfig.androidClientId,
  });

  const canSignIn = firebaseReady && isGoogleAuthConfigured() && Boolean(request);

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
    if (!canSignIn) {
      Alert.alert(t('auth.configMissingTitle'), t('auth.configMissing'));
      return;
    }
    try {
      setSigningIn(true);
      const result = await promptAsync();
      if (result.type !== 'success') return;

      const idToken =
        result.authentication?.idToken ??
        (result.params?.id_token as string | undefined);
      if (idToken && auth) {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      }
    } catch (error) {
      console.warn('[auth] Google ile giriş başarısız', error);
      Alert.alert(t('common.appName'), t('auth.signInError'));
    } finally {
      setSigningIn(false);
    }
  }, [canSignIn, promptAsync]);

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
        Alert.alert(t('common.appName'), t('auth.devSignInError'));
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      signingIn,
      canSignIn,
      signInWithGoogle,
      signInWithEmail,
      signOut,
    }),
    [user, initializing, signingIn, canSignIn, signInWithGoogle, signInWithEmail, signOut],
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
