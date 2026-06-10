import { colors, palette } from './colors';
import { radii } from './radii';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { fontWeights, typography } from './typography';

/**
 * Tüm tasarım token'larını tek bir `theme` nesnesinde toplar.
 * Bileşenler `useTheme()` ile buna erişir (bkz. ThemeProvider).
 */
export const theme = {
  colors,
  palette,
  spacing,
  radii,
  shadows,
  typography,
  fontWeights,
} as const;

export type Theme = typeof theme;

export { colors, palette, radii, shadows, spacing, typography, fontWeights };
export type { ColorToken } from './colors';
export type { SpacingToken } from './spacing';
export type { RadiusToken } from './radii';
export type { ShadowToken } from './shadows';
export type { TextVariant } from './typography';
export { ThemeProvider, useTheme } from './ThemeProvider';
