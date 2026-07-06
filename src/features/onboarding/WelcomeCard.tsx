import { Pressable, View } from 'react-native';

import { t } from '@/i18n';
import { Button, Card, Nafu, Text } from '@/ui';
import { spacing } from '@/ui/theme/spacing';

/**
 * İlk kullanımda Bugün ekranının üstünde beliren hoş geldin kartı: kullanıcıyı
 * ilk görev + eş davetine yönlendirir (aktivasyon). "Geç" kalıcı kapatır.
 */
export function WelcomeCard({
  onAddTask,
  onInvite,
  onDismiss,
}: {
  onAddTask: () => void;
  onInvite: () => void;
  onDismiss: () => void;
}) {
  return (
    <Card style={{ gap: spacing.md, marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Nafu expression="wave" size={56} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{t('onboarding.title')}</Text>
          <Text variant="caption" tone="secondary">
            {t('onboarding.body')}
          </Text>
        </View>
      </View>
      <Button title={t('onboarding.addTask')} onPress={onAddTask} />
      <Button variant="secondary" title={t('onboarding.invite')} onPress={onInvite} />
      <Pressable onPress={onDismiss} hitSlop={8} style={{ alignSelf: 'center' }}>
        <Text variant="caption" tone="muted">
          {t('onboarding.dismiss')}
        </Text>
      </Pressable>
    </Card>
  );
}
