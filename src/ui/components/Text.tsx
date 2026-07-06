import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { typography, type TextVariant } from '../theme/typography';
import { useColors } from '../theme/ThemeProvider';

type Tone = 'primary' | 'secondary' | 'muted' | 'onDark' | 'link' | 'accent' | 'inverse';

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
  const colors = useColors();
  const toneColor: Record<Tone, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    onDark: colors.textOnDark,
    inverse: colors.textOnDark,
    link: colors.textLink,
    accent: colors.accent,
  };
  return (
    <RNText
      style={[
        typography[variant],
        { color: color ?? toneColor[tone] },
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}
    />
  );
}
