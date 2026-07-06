import { Platform, type TextStyle } from 'react-native';

/**
 * Tipografi ölçeği. Şimdilik sistem fontu (iOS'ta San Francisco) — net, sıcak
 * ve Türkçe karakterlerle sorunsuz. İleride markalı bir font eklenebilir.
 */

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const fontFamilyMedium = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'System',
});

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

type Variant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'title'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'caption'
  | 'button'
  | 'overline';

export const typography: Record<Variant, TextStyle> = {
  display: {
    fontFamily: fontFamilyMedium,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: fontWeights.heavy,
    letterSpacing: 0.2,
  },
  h1: {
    fontFamily: fontFamilyMedium,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: fontWeights.bold,
  },
  h2: {
    fontFamily: fontFamilyMedium,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
  },
  title: {
    fontFamily: fontFamilyMedium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.semibold,
  },
  body: {
    fontFamily,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: fontWeights.regular,
  },
  bodyStrong: {
    fontFamily: fontFamilyMedium,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: fontWeights.semibold,
  },
  small: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
  },
  caption: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  button: {
    fontFamily: fontFamilyMedium,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
  },
  overline: {
    fontFamily: fontFamilyMedium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
};

export type TextVariant = Variant;
