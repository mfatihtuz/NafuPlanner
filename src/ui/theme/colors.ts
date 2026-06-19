import { Appearance } from 'react-native';

/**
 * Nafu Planlayıcı renk paleti.
 *
 * Sıcak, oyunbaz bir teal kimliği. Tüm UI renkleri buradan türer; tek kaynak.
 * Marka birincil rengi `teal[500]`. Oyunlaştırma/kutlama için sıcak mercan ve
 * altın aksanlar teal ile dengelenir.
 *
 * Koyu mod: aktif tema, modül yüklenirken cihazın görünüm tercihine
 * (Appearance) göre seçilir. Bileşenler `colors`'ı statik import edip satır içi
 * stil kullandığı için bu, ek bir refactor gerektirmeden hem satır içi hem de
 * StyleSheet.create stillerini doğru renklerle besler.
 */

const teal = {
  50: '#ECFBF8',
  100: '#CFF3EC',
  200: '#A6E7DC',
  300: '#72D6C7',
  400: '#3FBEAE',
  500: '#1AA597',
  600: '#0E8A7F',
  700: '#0B6F66',
  800: '#0C5851',
  900: '#0B3D38',
} as const;

const coral = {
  100: '#FFE3D9',
  300: '#FFB3A0',
  500: '#FF7A59',
  700: '#E2563A',
} as const;

const gold = {
  100: '#FBEFCB',
  300: '#F6D679',
  500: '#F4B740',
  700: '#D8951C',
} as const;

const gray = {
  0: '#FFFFFF',
  50: '#F7FAF9',
  100: '#EEF4F2',
  200: '#E3ECEA',
  300: '#CBD8D5',
  400: '#9DAFAB',
  500: '#758884',
  600: '#566B67',
  700: '#3C504C',
  800: '#26352F',
  900: '#14211E',
} as const;

export const palette = { teal, coral, gold, gray } as const;

/**
 * Anlamsal renkler — bileşenler bunları kullanır, ham paleti değil. Açık tema.
 */
const lightColors = {
  // Marka
  primary: teal[500],
  primaryDark: teal[600],
  primaryLight: teal[300],
  primarySoft: teal[100],
  primaryTint: teal[50],
  onPrimary: gray[0],

  // Aksanlar
  accent: coral[500],
  accentSoft: coral[100],
  reward: gold[500],
  rewardSoft: gold[100],

  // Yüzeyler
  background: gray[50],
  surface: gray[0],
  surfaceAlt: gray[100],
  surfaceTint: teal[50],
  border: gray[200],
  borderStrong: gray[300],
  overlay: 'rgba(11, 61, 56, 0.45)',

  // Metin
  textPrimary: gray[900],
  textSecondary: gray[600],
  textMuted: gray[400],
  textOnDark: gray[0],
  textLink: teal[600],

  // Durum
  success: '#2BB673',
  successSoft: '#DBF4E7',
  warning: gold[500],
  warningSoft: gold[100],
  danger: '#E5564D',
  dangerSoft: '#FBE0DE',
  info: teal[500],

  // Öncelik (görev önceliği rozetleri)
  priorityLow: teal[400],
  priorityMedium: gold[500],
  priorityHigh: coral[500],
  priorityUrgent: '#E5564D',
};

export type ColorToken = keyof typeof lightColors;

/**
 * Koyu tema. Yüzeyler koyu teal-siyah; "ön plan" aksanları (primaryDark gibi
 * ikon/metin renkleri) koyu zeminde görünür kalsın diye AÇIK teal tonlarına
 * çevrilir. Marka düğmesi (primary) açık moddaki ile aynı kalır ki üstündeki
 * beyaz metnin kontrastı korunsun.
 */
const darkColors: Record<ColorToken, string> = {
  primary: teal[500],
  primaryDark: teal[300],
  primaryLight: teal[400],
  primarySoft: '#123A35',
  primaryTint: '#0F2A27',
  onPrimary: gray[0],

  accent: coral[500],
  accentSoft: '#3A241C',
  reward: gold[500],
  rewardSoft: '#3A2E12',

  background: '#0E1614',
  surface: '#17211E',
  surfaceAlt: '#1F2B27',
  surfaceTint: '#13241F',
  border: '#2A3733',
  borderStrong: '#3B4A45',
  overlay: 'rgba(0, 0, 0, 0.55)',

  textPrimary: '#EAF2F0',
  textSecondary: '#A6B6B1',
  textMuted: '#6F807B',
  textOnDark: gray[0],
  textLink: teal[300],

  success: '#34C07E',
  successSoft: '#16352A',
  warning: gold[500],
  warningSoft: '#3A2E12',
  danger: '#F26A60',
  dangerSoft: '#3A1F1D',
  info: teal[400],

  priorityLow: teal[300],
  priorityMedium: gold[500],
  priorityHigh: coral[500],
  priorityUrgent: '#F26A60',
};

export type ColorScheme = 'light' | 'dark';

/** Cihazın o anki sistem renk şeması. */
export function systemScheme(): ColorScheme {
  try {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/**
 * Aktif anlamsal renkler — DEĞİŞTİRİLEBİLİR tek nesne (singleton). Tüm bileşenler
 * bunu okur; tema değişince `applyColorScheme` ile YERİNDE güncellenir (referans
 * sabit kalır). Canlı tema geçişi: ThemeProvider önce bunu günceller, sonra
 * context değişimiyle abone bileşenler yeniden render olup taze renkleri okur.
 * Başlangıç değeri sistem şemasına göre (ilk boyamada doğru renk).
 */
export const colors: Record<ColorToken, string> = {
  ...(systemScheme() === 'dark' ? darkColors : lightColors),
};

/** Verilen şemayı uygular: `colors` singleton'ını yerinde günceller. */
export function applyColorScheme(scheme: ColorScheme): void {
  Object.assign(colors, scheme === 'dark' ? darkColors : lightColors);
}
