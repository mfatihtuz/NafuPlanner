import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { formatDueLabel } from '@/domain/format';
import type { ActivityEntry } from '@/domain/types';
import { setNotifSeen, useNotifications } from '@/features/notifications/useNotifications';
import { useNow } from '@/hooks/useNow';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { Card, EmptyState, Icon, Screen, Text } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { spacing } from '@/ui/theme/spacing';

function lineFor(entry: ActivityEntry): {
  icon: 'checkSquare' | 'message' | 'bell';
  text: string;
} {
  const name = entry.actorName.split(' ')[0];
  const task = entry.taskTitle ?? '';
  switch (entry.type) {
    case 'task_assigned':
      return { icon: 'checkSquare', text: t('notifications.assigned', { name, task }) };
    case 'task_commented':
      return { icon: 'message', text: t('notifications.commented', { name, task }) };
    case 'task_nudged':
      return { icon: 'bell', text: t('notifications.nudged', { name, task }) };
    default:
      return { icon: 'bell', text: '' };
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const now = useNow();
  const { user } = useAuth();
  const { household } = useHousehold();
  const notifications = useNotifications(household?.id ?? null, user?.uid ?? null);

  // Açılınca "görüldü" damgası — Bugün ekranındaki nokta temizlenir.
  useEffect(() => {
    if (user?.uid) void setNotifSeen(user.uid, Date.now());
  }, [user?.uid]);

  return (
    <Screen scroll padded edges={['left', 'right', 'bottom']}>
      <View style={{ gap: spacing.sm, paddingBottom: spacing.xxl }}>
        {notifications && notifications.length === 0 ? (
          <EmptyState
            expression="sleep"
            title={t('notifications.title')}
            body={t('notifications.empty')}
          />
        ) : (
          (notifications ?? []).map((entry) => {
            const { icon, text } = lineFor(entry);
            return (
              <Pressable
                key={entry.id}
                onPress={() => {
                  if (entry.taskId) {
                    router.push({ pathname: '/task/[id]', params: { id: entry.taskId } });
                  }
                }}
              >
                {({ pressed }) => (
                  <Card
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      opacity: pressed ? 0.9 : 1,
                    }}
                  >
                    <Icon name={icon} size={20} color={colors.primaryDark} />
                    <View style={{ flex: 1 }}>
                      <Text variant="small">{text}</Text>
                      <Text variant="caption" tone="muted">
                        {formatDueLabel(entry.atMs, true, now)}
                      </Text>
                    </View>
                    {entry.taskId ? (
                      <Icon name="chevronRight" size={18} color={colors.textMuted} />
                    ) : null}
                  </Card>
                )}
              </Pressable>
            );
          })
        )}
      </View>
    </Screen>
  );
}
