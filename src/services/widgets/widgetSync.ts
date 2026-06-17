import { ExtensionStorage } from '@bacons/apple-targets';
import { Platform } from 'react-native';

import type { WidgetSnapshot } from '@/domain/widget';

/**
 * iOS widget'ına (kilit ekranı + ana ekran) "günüm" anlık görüntüsünü yazar.
 *
 * Widget ayrı süreçte çalışır; Firebase/JS koşamaz. Uygulama bu JSON'u App Group
 * paylaşımlı UserDefaults'una yazar, widget okur. `@bacons/apple-targets` native
 * modülü yalnız iOS dev-client/EAS build'inde vardır; Expo Go / Android / web'de
 * sessizce devre dışıdır.
 *
 * App Group kimliği üç yerde BİREBİR aynı olmalı: app.config.ts (entitlements),
 * targets/widget/expo-target.config.js ve Swift `suiteName`.
 */

const APP_GROUP = 'group.com.nafuplanner.app';
const SNAPSHOT_KEY = 'today_snapshot';

let storage: ExtensionStorage | null | undefined;

function getStorage(): ExtensionStorage | null {
  if (storage !== undefined) return storage;
  storage = Platform.OS === 'ios' ? new ExtensionStorage(APP_GROUP) : null;
  return storage;
}

export function writeWidgetSnapshot(snapshot: WidgetSnapshot): void {
  if (Platform.OS !== 'ios') return;
  try {
    const store = getStorage();
    if (!store) return;
    // Tek anahtara JSON string yazıyoruz (Swift `string(forKey:)` ile çözülür).
    store.set(SNAPSHOT_KEY, JSON.stringify(snapshot));
    // Zaman çizelgelerini yeniden kur (uygulama önplandayken bütçeden düşmez).
    ExtensionStorage.reloadWidget();
  } catch (error) {
    // Native modül yoksa / beklenmedik hata → widget opsiyonel, sessiz geç.
    console.warn('[widget] anlık görüntü yazılamadı', error);
  }
}
