import type { ViewStyle } from 'react-native';

import { colors } from './colors';
import { radii } from './radii';

/**
 * Liste satır kartlarının ortak yüzeyi (zemin + kenarlık + köşe). Görev kartı,
 * alışveriş satırı vb. bunu paylaşır; gölge / iç boşluk / hizalama çağıran
 * tarafta kalır (görünüm birebir korunur). `elevated`: yükseltilmiş kart (lg
 * köşe) — düz satırlar için false (md köşe).
 */
export function rowCardSurface(elevated: boolean): ViewStyle {
  return {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: elevated ? radii.lg : radii.md,
  };
}
