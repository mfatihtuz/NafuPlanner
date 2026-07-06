import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/services/auth/AuthProvider';
import { ErrorBoundary } from '@/ui/ErrorBoundary';
import { ThemeProvider, useTheme } from '@/ui/theme';
import { colors } from '@/ui/theme/colors';

// Oturum durumu çözülene kadar açılış ekranı görünür kalsın.
void SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { user, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    void SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [user, initializing, segments, router]);

  if (initializing) return null;
  return <Slot />;
}

/** StatusBar metnini aktif temaya göre ayarlar (koyu modda açık metin). */
function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <ThemedStatusBar />
              <AuthGate />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
