import { View } from 'react-native';

import { t, type TranslationKey } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { EmptyState, Screen, Text, spacing } from '@/ui';

function greetingKey(): TranslationKey {
  const hour = new Date().getHours();
  if (hour < 12) return 'today.greetingMorning';
  if (hour < 18) return 'today.greetingAfternoon';
  return 'today.greetingEvening';
}

export default function TodayScreen() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] ?? '';

  return (
    <Screen>
      <View style={{ marginBottom: spacing.lg }}>
        <Text variant="small" tone="secondary">
          {t(greetingKey())}
        </Text>
        <Text variant="h1">{firstName || t('today.title')}</Text>
      </View>

      <EmptyState
        expression="happy"
        title={t('today.emptyTitle')}
        body={t('today.emptyBody')}
      />
    </Screen>
  );
}
