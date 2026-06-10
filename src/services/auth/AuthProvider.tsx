import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
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
      signOut,
    }),
    [user, initializing, signingIn, canSignIn, signInWithGoogle, signOut],
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
