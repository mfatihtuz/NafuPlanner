import { getLocales } from 'expo-localization';

import { tr, type TranslationKey } from './tr';

/**
 * Hafif, bağımlılıksız i18n. Şu an tek dil: Türkçe (varsayılan).
 * İleride başka diller eklemek için `dictionaries` haritasına yeni sözlük
 * ekleyip cihaz diline göre seçim yapmak yeterli.
 */
const dictionaries = { tr } as const;

type Locale = keyof typeof dictionaries;

const DEFAULT_LOCALE: Locale = 'tr';

function resolveLocale(): Locale {
  const code = getLocales()[0]?.languageCode ?? DEFAULT_LOCALE;
  return (code in dictionaries ? code : DEFAULT_LOCALE) as Locale;
}

const activeLocale = resolveLocale();
const activeDictionary = dictionaries[activeLocale];

export type TranslateParams = Record<string, string | number>;

/**
 * Bir anahtarı çevirir. {{deger}} biçimindeki yer tutucular `params` ile
 * değiştirilir. Anahtar tipi denetlenir; yanlış anahtar derlenmez.
 */
export function t(key: TranslationKey, params?: TranslateParams): string {
  let value: string = activeDictionary[key] ?? key;
  if (params) {
    for (const [name, replacement] of Object.entries(params)) {
      value = value.replace(new RegExp(`{{\\s*${name}\\s*}}`, 'g'), String(replacement));
    }
  }
  return value;
}

export { type TranslationKey };
