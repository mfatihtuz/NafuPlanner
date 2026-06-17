/**
 * Nafu Planlayıcı — iOS WidgetKit hedef tanımı (@bacons/apple-targets).
 *
 * Bu dosya CommonJS olmalıdır (TS/ESM desteklenmez). Hedef, App Group üzerinden
 * uygulamanın yazdığı "günüm" anlık görüntüsünü okuyan native bir widget'tır;
 * JS/Firebase çalıştırmaz.
 *
 * SDK 56 NOTU: Expo 56 iOS tabanını 16.4'e çeker. Eklentinin eski örnekleri
 * 15.1 kullandığı için build kırılıyordu (apple-targets#196). deploymentTarget
 * burada AÇIKÇA 16.4'e sabitlenir (kilit ekranı accessory aileleri de iOS 16+).
 */
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'widget',
  displayName: 'Nafu — Günüm',

  // Ana uygulamanın bundle id'sine eklenir → com.nafuplanner.app.widgets
  bundleIdentifier: '.widgets',

  deploymentTarget: '16.4',
  frameworks: ['SwiftUI', 'WidgetKit'],

  // App Group ana uygulamayla BİREBİR aynı olmalı (app.config.ts ios.entitlements
  // ve Swift suiteName ile). Uyuşmazlık → widget sessizce boş okur.
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },

  // Widget galerisinde düzenleme tonu (marka teal). Görünüm renklerini Swift'te
  // hex ile çiziyoruz; bu yalnız sistem tonu içindir.
  colors: {
    $accent: '#1AA597',
  },
});
