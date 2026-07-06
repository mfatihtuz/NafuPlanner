import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance } from 'react-native';

import {
  applyColorScheme,
  colors,
  systemScheme,
  type ColorScheme,
  type ColorToken,
} from './colors';

/**
 * Tema (açık/koyu) sağlayıcı — CANLI geçiş.
 *
 * Bileşenler renkleri `useColors()` ile okur; bu hook context'e abone olur, yani
 * tema değişince yeniden render olur. Renkler değiştirilebilir `colors`
 * singleton'ında tutulur; geçişte önce singleton güncellenir (applyColorScheme),
 * sonra context değişir → abone bileşenler taze renkleri okur. Tercih (sistem/
 * açık/koyu) kalıcıdır; "sistem" seçiliyse OS teması canlı izlenir.
 */

export type ThemePref = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'nafu:themePref';

interface ThemeContextValue {
  pref: ThemePref;
  scheme: ColorScheme;
  setPref: (pref: ThemePref) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  pref: 'system',
  scheme: 'light',
  setPref: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>('system');
  const [sysScheme, setSysScheme] = useState<ColorScheme>(systemScheme());

  // Kayıtlı tercihi yükle.
  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'light' || value === 'dark' || value === 'system') {
        setPrefState(value);
      }
    });
  }, []);

  // "Sistem" seçiliyken OS teması değişimini canlı izle.
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSysScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  const scheme: ColorScheme = pref === 'system' ? sysScheme : pref;

  // Singleton'ı geçerli şemaya çek (render sırasında; idempotent, ucuz). Aboneler
  // yeniden render olmadan önce taze renkler hazır olur.
  applyColorScheme(scheme);

  const setPref = (next: ThemePref) => {
    setPrefState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<ThemeContextValue>(() => ({ pref, scheme, setPref }), [pref, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Tema tercihi/şeması + değiştirici (ör. ayarlar ekranı, StatusBar). */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * Aktif renkleri döndürür ve tema değişimine ABONE olur (geçişte yeniden render).
 * Renk kullanan bileşenler `import { colors }` yerine bunu kullanmalı.
 */
export function useColors(): Record<ColorToken, string> {
  useContext(ThemeContext); // aboneliği kur (renkler singleton'da, değer aynı referans)
  return colors;
}
