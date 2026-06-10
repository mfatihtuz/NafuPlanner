import { View, type ViewProps } from 'react-native';

import { colors } from '../theme/colors';
import { radii } from '../theme/radii';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';

export interface CardProps extends ViewProps {
  padded?: boolean;
  tinted?: boolean;
  elevated?: boolean;
}

export function Card({
  padded = true,
  tinted = false,
  elevated = true,
  style,
  ...rest
}: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: tinted ? colors.surfaceTint : colors.surface,
          borderRadius: radii.lg,
          borderWidth: tinted ? 0 : 1,
          borderColor: colors.border,
          padding: padded ? spacing.lg : 0,
        },
        elevated && shadows.sm,
        style,
      ]}
      {...rest}
    />
  );
}
