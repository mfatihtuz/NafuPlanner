import { Pressable, View, type ViewStyle } from 'react-native';

import { colors } from '../theme/colors';
import { radii } from '../theme/radii';
import { spacing } from '../theme/spacing';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Sol tarafta renk noktası (kategori/öncelik için). */
  dotColor?: string;
  leftSlot?: React.ReactNode;
  style?: ViewStyle;
}

/** Seçilebilir küçük etiket (kategori, öncelik, tarih kısayolları). */
export function Chip({ label, selected = false, onPress, dotColor, leftSlot, style }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          height: 36,
          borderRadius: radii.pill,
          borderWidth: 1.5,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          gap: spacing.xs,
        },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {dotColor ? (
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dotColor }} />
      ) : null}
      {leftSlot}
      <Text variant="small" tone={selected ? 'primary' : 'secondary'} style={selected && { color: colors.primaryDark, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}
