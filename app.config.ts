import type { ConfigContext, ExpoConfig } from 'expo/config';

const BRAND = {
  name: 'Nafu Planlayıcı',
  slug: 'nafu-planlayici',
  scheme: 'nafu',
  bundleId: 'com.nafugroup.nafuplanlayici',
  splashBackground: '#FFFFFF',
  notificationColor: '#0E9F9A',
};

// iOS reversed Google client id (e.g. com.googleusercontent.apps.XXXX).
// Used to register the OAuth redirect URL scheme for native Google Sign-In.
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;

const iosUrlSchemes = [googleIosUrlScheme].filter(Boolean) as string[];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: BRAND.name,
  slug: BRAND.slug,
  owner: 'mfatihtuz',
  scheme: BRAND.scheme,
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: BRAND.bundleId,
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      ...(iosUrlSchemes.length > 0
        ? {
            CFBundleURLTypes: [
              {
                CFBundleURLSchemes: iosUrlSchemes,
              },
            ],
          }
        : {}),
    },
  },
  android: {
    package: BRAND.bundleId,
    adaptiveIcon: {
      backgroundColor: '#E6F7F5',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: BRAND.splashBackground,
      },
    ],
    'expo-secure-store',
    'expo-localization',
    'expo-web-browser',
    'expo-apple-authentication',
    [
      'expo-notifications',
      {
        color: BRAND.notificationColor,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      // EAS proje kimliği (eas init ile üretildi). Build + push token bunu
      // kullanır; gizli değildir.
      projectId: 'cda55d2a-1823-4010-8506-d481310b66cd',
    },
  },
});
