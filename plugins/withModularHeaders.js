const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo'nun varsayılan iOS Podfile'ı pod'ları statik kütüphane olarak derler.
 * GoogleSignIn 9.0'ın çektiği Swift pod'ları (ör. AppCheckCore, GTMAppAuth)
 * modül tanımlamayan Objective-C pod'larına (GoogleUtilities, RecaptchaInterop,
 * AppAuth, GTMSessionFetcher) bağımlı. Statik kütüphane modunda Swift bu
 * modülsüz başlıkları import edemediği için `pod install` şu hatayla kırılır:
 *   "The following Swift pods cannot yet be integrated as static libraries"
 *
 * Çözüm (hata mesajının da önerdiği yol): Podfile'a global `use_modular_headers!`
 * ekleyerek tüm pod'lara modül haritası ürettiriyoruz. Bu linkajı DEĞİŞTİRMEZ
 * (statik kütüphane kalır), yalnız başlıkları modülerleştirir; böylece tüm
 * Google bağımlılıkları tek seferde çözülür ve diğer modüller etkilenmez.
 */
const withModularHeaders = (config) =>
  withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes('use_modular_headers!')) {
        // `platform :ios, ...` satırının hemen ardına global kapsamda ekle.
        contents = contents.replace(
          /^(platform :ios.*)$/m,
          '$1\nuse_modular_headers!'
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);

module.exports = withModularHeaders;
