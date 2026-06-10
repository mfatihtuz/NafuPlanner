import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors } from '../theme/colors';
import { typography, type TextVariant } from '../theme/typography';

type Tone = 'primary' | 'secondary' | 'muted' | 'onDark' | 'link' | 'accent' | 'inverse';

const TONE_COLOR: Record<Tone, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  onDark: colors.textOnDark,
  inverse: colors.textOnDark,
  link: colors.textLink,
  accent: colors.accent,
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: Tone;
  /** Doğrudan renk (tone'u geçersiz kılar). */
  color?: string;
  center?: boolean;
}

export function Text({
  variant = 'body',
  tone = 'primary',
  color,
  center,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      style={[
        typography[variant],
        { color: color ?? TONE_COLOR[tone] },
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}
    />
  );
}
