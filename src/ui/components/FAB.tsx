import { Pressable } from 'react-native';

import { colors } from '../theme/colors';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';
import { Icon } from '../icons';

export interface FABProps {
  onPress: () => void;
  accessibilityLabel: string;
}

/** Sağ altta yüzen "ekle" düğmesi. */
export function FAB({ onPress, accessibilityLabel }: FABProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        {
          position: 'absolute',
          right: spacing.lg,
          bottom: spacing.lg,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        shadows.lg,
        pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 },
      ]}
    >
      <Icon name="plus" size={28} color={colors.onPrimary} strokeWidth={2.5} />
    </Pressable>
  );
}
