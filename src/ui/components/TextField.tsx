import { TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '../theme/colors';
import { radii } from '../theme/radii';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Text } from './Text';

export interface TextFieldProps extends TextInputProps {
  label?: string;
}

export function TextField({ label, style, multiline, ...rest }: TextFieldProps) {
  // iOS'ta tek satırlık TextInput'a lineHeight verilince alt kuyruklar (y, g, p)
  // kırpılıyor. Çok satırda satır aralığı gerekli olduğundan lineHeight'ı yalnız
  // orada uygula; tek satırda doğal yüksekliğe bırak.
  const { lineHeight: bodyLineHeight, ...bodyBase } = typography.body;
  return (
    <View>
      {label ? (
        <Text variant="caption" tone="secondary" style={{ marginBottom: spacing.xs }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[
          bodyBase,
          {
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.border,
            borderRadius: radii.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            color: colors.textPrimary,
            minHeight: multiline ? 88 : 50,
            textAlignVertical: multiline ? 'top' : 'center',
            ...(multiline ? { lineHeight: bodyLineHeight } : null),
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}
