import { Pressable, View } from 'react-native';

import type { ClockTime } from '@/domain/types';

import { colors } from '../theme/colors';
import { radii } from '../theme/radii';
import { spacing } from '../theme/spacing';
import { Icon } from '../icons';
import { Text } from './Text';

const pad2 = (n: number) => String(n).padStart(2, '0');

function Stepper({
  value,
  onUp,
  onDown,
}: {
  value: string;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      <Pressable hitSlop={8} onPress={onUp} accessibilityLabel="+">
        <Icon name="plus" size={20} color={colors.primaryDark} />
      </Pressable>
      <Text variant="h2">{value}</Text>
      <Pressable hitSlop={8} onPress={onDown} accessibilityLabel="-">
        <Icon name="minus" size={20} color={colors.primaryDark} />
      </Pressable>
    </View>
  );
}

export interface TimeWheelProps {
  value: ClockTime;
  onChange: (next: ClockTime) => void;
  /** Dakika adımı (varsayılan 15). */
  minuteStep?: number;
}

/** Saat:dakika stepper bloğu (görev saati, sessiz saat, özet saati). */
export function TimeWheel({ value, onChange, minuteStep = 15 }: TimeWheelProps) {
  const step = (field: 'hour' | 'minute', delta: number) => {
    if (field === 'hour') {
      onChange({ ...value, hour: (value.hour + delta + 24) % 24 });
    } else {
      onChange({ ...value, minute: (value.minute + delta + 60) % 60 });
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.md,
        padding: spacing.md,
      }}
    >
      <Stepper
        value={pad2(value.hour)}
        onUp={() => step('hour', 1)}
        onDown={() => step('hour', -1)}
      />
      <Text variant="h2">:</Text>
      <Stepper
        value={pad2(value.minute)}
        onUp={() => step('minute', minuteStep)}
        onDown={() => step('minute', -minuteStep)}
      />
    </View>
  );
}
