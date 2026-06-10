import { View } from 'react-native';

import { spacing } from '../theme/spacing';
import { Nafu, type NafuExpression } from '../mascot/Nafu';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  body?: string;
  expression?: NafuExpression;
  size?: number;
}

/** Nafu eşliğinde dostane boş/bilgi durumu. */
export function EmptyState({
  title,
  body,
  expression = 'happy',
  size = 150,
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
    </View>
  );
}
