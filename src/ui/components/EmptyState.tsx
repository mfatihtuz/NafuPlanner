import { View } from 'react-native';

import { spacing } from '../theme/spacing';
import { Nafu, type NafuExpression } from '../mascot/Nafu';
import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  body?: string;
  expression?: NafuExpression;
  size?: number;
  /** Verilirse Nafu'nun altında birincil eylem butonu gösterilir. */
  actionLabel?: string;
  onAction?: () => void;
}

/** Nafu eşliğinde dostane boş/bilgi durumu; isteğe bağlı eylem butonuyla. */
export function EmptyState({
  title,
  body,
  expression = 'happy',
  size = 150,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
      }}
    >
      <Nafu expression={expression} size={size} />
      <Text variant="h2" center style={{ marginTop: spacing.lg }}>
        {title}
      </Text>
      {body ? (
        <Text tone="secondary" center style={{ marginTop: spacing.sm }}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          fullWidth={false}
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </View>
  );
}
