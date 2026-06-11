import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { groupTasks } from '@/domain/tasks';
import type { Task } from '@/domain/types';
import { useCategories } from '@/features/categories/useCategories';
import { useCelebration } from '@/features/celebration/CelebrationProvider';
import { RequireHousehold } from '@/features/household/NoHousehold';
import { TaskCard } from '@/features/tasks/TaskCard';
import { useTasks } from '@/features/tasks/useTasks';
import { useNow } from '@/hooks/useNow';
import { t, type TranslationKey } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { completeTaskFlow, reopenTaskFlow } from '@/services/workflows/taskWorkflows';
import { useNotificationScheduler } from '@/services/notifications/useNotificationScheduler';
import { EmptyState, FAB, Screen, Text } from '@/ui';
import { spacing } from '@/ui/theme/spacing';

function greetingKey(): TranslationKey {
  const hour = new Date().getHours();
  if (hour < 12) return 'today.greetingMorning';
  if (hour < 18) return 'today.greetingAfternoon';
  return 'today.greetingEvening';
}

export default function TodayScreen() {
  return (
    <Screen padded={false}>
      <RequireHousehold>
        <TodayContent />
      </RequireHousehold>
    </Screen>
  );
}

function TodayContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { celebrate } = useCelebration();
  const { household, members, profile } = useHousehold();
  const tasks = useTasks(household?.id ?? null);
  const categories = useCategories(household?.id ?? null);

  useNotificationScheduler(tasks, profile?.settings, user?.uid ?? null);

  const now = useNow();
  const sections = useMemo(() => (tasks ? groupTasks(tasks, now) : null), [tasks, now]);
  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );
  const memberMap = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);

  const firstName = user?.displayName?.split(' ')[0] ?? '';

  const onToggle = (task: Task) => {
    if (!household || !user) return;
    const actor = { uid: user.uid, name: user.displayName ?? 'Üye' };
    if (task.status === 'done') {
      reopenTaskFlow(task).catch((error) =>
        console.warn('[today] görev güncellenemedi', error),
      );
    } else {
      completeTaskFlow({ task, actor, members })
        .then(celebrate)
        .catch((error) => console.warn('[today] görev güncellenemedi', error));
    }
  };

  const renderTask = (task: Task) => (
    <TaskCard
      key={task.id}
      task={task}
      category={task.categoryId ? categoryMap.get(task.categoryId) : null}
      assignees={task.assigneeIds
        .map((id) => memberMap.get(id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))}
      onToggleComplete={onToggle}
      onPress={(item) => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
    />
  );

  const isEmpty = sections && sections.overdue.length === 0 && sections.today.length === 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 96, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: spacing.lg }}>
          <Text variant="small" tone="secondary">
            {t(greetingKey())}
          </Text>
          <Text variant="h1">{firstName || t('today.title')}</Text>
        </View>

        {sections == null ? null : isEmpty ? (
          <EmptyState
            expression="celebrate"
            title={t('today.emptyTitle')}
            body={t('today.emptyBody')}
          />
        ) : (
          <View style={{ gap: spacing.xl }}>
            {sections.overdue.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                <Text variant="overline" tone="accent">
                  {t('today.overdue')}
                </Text>
                {sections.overdue.map(renderTask)}
              </View>
            ) : null}

            {sections.today.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                <Text variant="overline" tone="secondary">
                  {t('today.todayTasks')}
                </Text>
                {sections.today.map(renderTask)}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <FAB accessibilityLabel={t('tasks.add')} onPress={() => router.push('/task-form')} />
    </View>
  );
}
