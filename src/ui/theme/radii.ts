/**
 * Köşe yarıçapları. Yumuşak, dostane bir his için cömert yuvarlatma.
 */
export const radii = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;
