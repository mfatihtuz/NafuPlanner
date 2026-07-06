import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { radii } from '../theme/radii';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useColors } from '../theme/ThemeProvider';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftSlot?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  variant = 'primary',
  size = 'lg',
  loading = false,
  fullWidth = true,
  leftSlot,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const colors = useColors();
  const bg: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.primarySoft,
    ghost: 'transparent',
    danger: colors.danger,
  };
  const fg: Record<Variant, string> = {
    primary: colors.onPrimary,
    secondary: colors.primaryDark,
    ghost: colors.primaryDark,
    danger: colors.onPrimary,
  };
  const isDisabled = disabled || loading;
  const height = size === 'lg' ? 54 : 44;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: bg[variant],
          borderColor: variant === 'ghost' ? colors.border : 'transparent',
          borderWidth: variant === 'ghost' ? 1.5 : 0,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: size === 'lg' ? spacing.xl : spacing.lg,
        },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <View style={styles.content}>
          {leftSlot ? <View style={styles.leftSlot}>{leftSlot}</View> : null}
          <Text style={[typography.button, { color: fg[variant] }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftSlot: {
    marginRight: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
