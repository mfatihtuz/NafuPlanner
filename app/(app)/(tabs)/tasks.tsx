import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { groupTasks, type TaskSections } from '@/domain/tasks';
import type { Task } from '@/domain/types';
import { useCategories } from '@/features/categories/useCategories';
import { RequireHousehold } from '@/features/household/NoHousehold';
import { TaskCard } from '@/features/tasks/TaskCard';
import { useTasks } from '@/features/tasks/useTasks';
import { useNow } from '@/hooks/useNow';
import { t, type TranslationKey } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { completeTaskFlow, reopenTaskFlow } from '@/services/workflows/taskWorkflows';
import { EmptyState, FAB, Screen, Text } from '@/ui';
import { spacing } from '@/ui/theme/spacing';

const SECTION_ORDER: { key: keyof TaskSections; label: TranslationKey; accent?: boolean }[] = [
  { key: 'overdue', label: 'tasks.sectionOverdue', accent: true },
  { key: 'today', label: 'tasks.sectionToday' },
  { key: 'upcoming', label: 'tasks.sectionUpcoming' },
  { key: 'noDate', label: 'tasks.sectionNoDate' },
  { key: 'done', label: 'tasks.sectionDone' },
];

const DONE_LIMIT = 15;

export default function TasksScreen() {
  return (
    <Screen padded={false}>
      <RequireHousehold>
        <TasksContent />
      </RequireHousehold>
    </Screen>
  );
}

function TasksContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { household, members } = useHousehold();
  const tasks = useTasks(household?.id ?? null);
  const categories = useCategories(household?.id ?? null);

  const now = useNow();
  const sections = useMemo(() => (tasks ? groupTasks(tasks, now) : null), [tasks, now]);
  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );
  const memberMap = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);

  const onToggle = (task: Task) => {
    if (!household || !user) return;
    const actor = { uid: user.uid, name: user.displayName ?? 'Üye' };
    const action =
      task.status === 'done'
        ? reopenTaskFlow(task)
        : completeTaskFlow({ task, actor, members });
    action.catch((error) => console.warn('[tasks] görev güncellenemedi', error));
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

  const isEmpty =
    sections != null && SECTION_ORDER.every(({ key }) => sections[key].length === 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 96, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {sections == null ? null : isEmpty ? (
          <EmptyState expression="happy" title={t('tasks.title')} body={t('tasks.empty')} />
        ) : (
          <View style={{ gap: spacing.xl }}>
            {SECTION_ORDER.map(({ key, label, accent }) => {
              const list = key === 'done' ? sections[key].slice(0, DONE_LIMIT) : sections[key];
              if (list.length === 0) return null;
              return (
                <View key={key} style={{ gap: spacing.sm }}>
                  <Text variant="overline" tone={accent ? 'accent' : 'secondary'}>
                    {t(label)}
                  </Text>
                  {list.map(renderTask)}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <FAB accessibilityLabel={t('tasks.add')} onPress={() => router.push('/task-form')} />
    </View>
  );
}
