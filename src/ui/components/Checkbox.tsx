import { Pressable } from 'react-native';

import { colors } from '../theme/colors';
import { Icon } from '../icons';

export interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  size?: number;
}

/** Yuvarlak görev onay kutusu. */
export function Checkbox({ checked, onToggle, size = 28 }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: checked ? colors.primary : colors.borderStrong,
          backgroundColor: checked ? colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      {checked ? <Icon name="check" size={size * 0.6} color={colors.onPrimary} strokeWidth={3} /> : null}
    </Pressable>
  );
}
