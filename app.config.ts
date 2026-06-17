import type { ConfigContext, ExpoConfig } from 'expo/config';

const BRAND = {
  name: 'Nafu Planlayıcı',
  slug: 'nafu-planlayici',
  scheme: 'nafu',
  bundleId: 'com.nafuplanner.app',
  splashBackground: '#FFFFFF',
  notificationColor: '#0E9F9A',
};

// iOS widget (kilit ekranı + ana ekran) için App Group + Apple Team. Widget,
// uygulamanın yazdığı "günüm" anlık görüntüsünü bu App Group üzerinden okur.
// App Group kimliği üç yerde birebir aynı olmalı: burada, targets/widget/
// expo-target.config.js ve Swift suiteName (src/services/widgets/widgetSync.ts).
const APP_GROUP = 'group.com.nafuplanner.app';
const APPLE_TEAM_ID = '3GH53K2WWV';
const WIDGET_BUNDLE_ID = `${BRAND.bundleId}.widgets`;

// iOS reversed Google client id (e.g. com.googleusercontent.apps.XXXX).
// Used to register the OAuth redirect URL scheme for native Google Sign-In.
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;

// Native Google Sign-In iOS URL şemasını (reversed client id) yalnız mevcutsa
// ekle; eksikse eklenti hiç konmaz (build kırılmaz).
const googlePlugin: [string, { iosUrlScheme: string }] | null = googleIosUrlScheme
  ? ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]
  : null;

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
    appleTeamId: APPLE_TEAM_ID,
    usesAppleSignIn: true,
    // App Group entitlement'ı ana uygulamaya AÇIKÇA verilir (apple-targets
    // eklentisi bunu yalnız widget hedefine kopyalar, ana uygulamaya eklemez).
    entitlements: {
      'com.apple.security.application-groups': [APP_GROUP],
    },
    infoPlist: {
      // Google iOS URL şeması artık @react-native-google-signin eklentisiyle
      // yönetiliyor (aşağıdaki plugins).
      ITSAppUsesNonExemptEncryption: false,
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
    ...(googlePlugin ? [googlePlugin] : []),
    [
      'expo-image-picker',
      {
        photosPermission: 'Nafu, görevlere fotoğraf eklemen için galerine erişir.',
        cameraPermission: 'Nafu, görevlere fotoğraf çekmen için kameranı kullanır.',
      },
    ],
    [
      'expo-notifications',
      {
        color: BRAND.notificationColor,
        // Haftalık Nafu ödülü bildirimi için özel ses (diğer bildirimler
        // varsayılan sesi kullanır).
        sounds: ['./assets/sounds/nafu-reward.wav'],
      },
    ],
    // GoogleSignIn'in Swift bağımlılıklarının (AppCheckCore vb.) statik kütüphane
    // modunda derlenebilmesi için Podfile'a global `use_modular_headers!` ekler;
    // aksi halde "Swift pods cannot be integrated as static libraries" ile pod
    // install kırılır.
    './plugins/withModularHeaders',
    // iOS widget hedefini (targets/widget) Xcode projesine ekler. Widget Swift
    // kodu native; App Group üzerinden "günüm" özetini okur.
    ['@bacons/apple-targets', { appleTeamId: APPLE_TEAM_ID }],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      // EAS proje kimliği (eas init ile üretildi). Build + push token bunu
      // kullanır; gizli değildir.
      projectId: 'cda55d2a-1823-4010-8506-d481310b66cd',
      build: {
        experimental: {
          ios: {
            // Widget hedefini EAS'a bildir ki imzalama kimliklerini + App
            // Group'u baştan üretsin (ilk build'de `eas credentials` ile bir
            // kez senkron önerilir).
            appExtensions: [
              {
                targetName: 'widget',
                bundleIdentifier: WIDGET_BUNDLE_ID,
                entitlements: {
                  'com.apple.security.application-groups': [APP_GROUP],
                },
              },
            ],
          },
        },
      },
    },
  },
});
