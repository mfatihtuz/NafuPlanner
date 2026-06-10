/**
 * Nafu Planlayıcı renk paleti.
 *
 * Sıcak, oyunbaz bir teal kimliği. Tüm UI renkleri buradan türer; tek kaynak.
 * Marka birincil rengi `teal[500]`. Oyunlaştırma/kutlama için sıcak mercan ve
 * altın aksanlar teal ile dengelenir.
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
 * Anlamsal renkler — bileşenler bunları kullanır, ham paleti değil.
 */
export const colors = {
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
} as const;

export type ColorToken = keyof typeof colors;
