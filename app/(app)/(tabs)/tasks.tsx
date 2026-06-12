import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { QUICK_START_TASKS } from '@/domain/quickStart';
import { filterTasksByQuery } from '@/domain/search';
import { groupTasks, type TaskSections } from '@/domain/tasks';
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
import { Chip, EmptyState, FAB, Screen, Text, TextField } from '@/ui';
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
  const { celebrate } = useCelebration();
  const { household, members } = useHousehold();
  const tasks = useTasks(household?.id ?? null);
  const categories = useCategories(household?.id ?? null);

  const [query, setQuery] = useState('');
  const now = useNow();
  const filtered = useMemo(
    () => (tasks ? filterTasksByQuery(tasks, query) : null),
    [tasks, query],
  );
  const sections = useMemo(() => (filtered ? groupTasks(filtered, now) : null), [filtered, now]);
  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );
  const memberMap = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);

  const onToggle = (task: Task) => {
    if (!household || !user) return;
    const actor = { uid: user.uid, name: user.displayName ?? 'Üye' };
    if (task.status === 'done') {
      reopenTaskFlow(task).catch((error) =>
        console.warn('[tasks] görev güncellenemedi', error),
      );
    } else {
      completeTaskFlow({ task, actor, members })
        .then(celebrate)
        .catch((error) => console.warn('[tasks] görev güncellenemedi', error));
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

  const isEmpty =
    sections != null && SECTION_ORDER.every(({ key }) => sections[key].length === 0);
  const hasAnyTask = tasks != null && tasks.length > 0;
  const searching = query.trim().length > 0;

  return (
    <View style={{ flex: 1 }}>
      {hasAnyTask ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder={t('tasks.searchPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 96, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {sections == null ? null : isEmpty ? (
          searching ? (
            <EmptyState
              expression="remind"
              title={t('tasks.noResults')}
              body={t('tasks.noResultsBody')}
            />
          ) : (
          <View style={{ flex: 1 }}>
            <EmptyState
              expression="happy"
              title={t('tasks.title')}
              body={t('tasks.empty')}
              actionLabel={t('tasks.add')}
              onAction={() => router.push('/task-form')}
            />
            <View style={{ paddingBottom: spacing.xl, gap: spacing.sm }}>
              <Text variant="caption" tone="muted" center>
                {t('tasks.quickStartHint')}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: spacing.sm,
                }}
              >
                {QUICK_START_TASKS.map((title) => (
                  <Chip
                    key={title}
                    label={title}
                    onPress={() => router.push({ pathname: '/task-form', params: { title } })}
                  />
                ))}
              </View>
            </View>
          </View>
          )
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
