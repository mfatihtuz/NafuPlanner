import { Platform, type ViewStyle } from 'react-native';

/**
 * Yumuşak, teal tonlu gölgeler. iOS gölge + Android elevation birlikte.
 */
const make = (
  elevation: number,
  radius: number,
  opacity: number,
  offsetY: number,
): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B3D38',
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: { elevation },
    default: {},
  }) as ViewStyle;

export const shadows = {
  none: make(0, 0, 0, 0),
  sm: make(2, 6, 0.08, 2),
  md: make(5, 14, 0.1, 6),
  lg: make(10, 24, 0.14, 12),
} as const;

export type ShadowToken = keyof typeof shadows;
