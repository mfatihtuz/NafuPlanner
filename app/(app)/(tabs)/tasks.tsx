import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { actorOf } from '@/services/auth/actor';
import { useMemberMap } from '@/features/household/useMemberMap';
import { QUICK_START_TASKS } from '@/domain/quickStart';
import { filterTasksByQuery } from '@/domain/search';
import { groupTasks, reorderTasks, type TaskSections } from '@/domain/tasks';
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
import { reopenTaskGate } from '@/features/tasks/reopenTask';
import { completeTaskGate } from '@/features/tasks/completeTask';
import { deleteTaskGate, reassignTaskGate, snoozeTaskGate } from '@/features/tasks/quickActions';
import { setTaskOrder } from '@/services/firestore/tasks';
import { Chip, EmptyState, FAB, Screen, Text, TextField } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { radii } from '@/ui/theme/radii';
import { rowCardSurface } from '@/ui/theme/rowCard';
import { spacing } from '@/ui/theme/spacing';

/** Sıralama oku (↑/↓). İkon setinde yukarı/aşağı ok yok; metin oku kullanılır. */
function ArrowButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      style={{
        width: 36,
        height: 36,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: disabled ? colors.surfaceAlt : colors.surface,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ fontSize: 18, color: colors.primaryDark, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

/** Sıralama modunda tarihsiz görev satırı (başlık + yukarı/aşağı). */
function ReorderRow({
  task,
  isFirst,
  isLast,
  onUp,
  onDown,
}: {
  task: Task;
  isFirst: boolean;
  isLast: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        ...rowCardSurface(true),
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
        {task.title}
      </Text>
      <ArrowButton label="↑" disabled={isFirst} onPress={onUp} />
      <ArrowButton label="↓" disabled={isLast} onPress={onDown} />
    </View>
  );
}

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
  const [reordering, setReordering] = useState(false);
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
  const memberMap = useMemberMap(members);

  const onToggle = (task: Task) => {
    if (!household || !user) return;
    const actor = actorOf(user);
    if (task.status === 'done') {
      reopenTaskGate(task, actor, members);
    } else {
      completeTaskGate(task, actor, members, celebrate);
    }
  };

  const onMove = (list: Task[], task: Task, dir: -1 | 1) => {
    if (!household) return;
    const updates = reorderTasks(list, task.id, dir);
    if (updates.length > 0) {
      setTaskOrder(household.id, updates).catch((error) =>
        console.warn('[tasks] sıralanamadı', error),
      );
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
      onSnooze={(item) => snoozeTaskGate(item, Date.now())}
      onReassign={
        user && members.length > 1
          ? (item) => reassignTaskGate(item, actorOf(user), members)
          : undefined
      }
      onDelete={(item) => deleteTaskGate(item)}
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
        keyboardDismissMode="on-drag"
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
              const canReorder = key === 'noDate' && list.length > 1;
              const showReorder = canReorder && reordering;
              return (
                <View key={key} style={{ gap: spacing.sm }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text variant="overline" tone={accent ? 'accent' : 'secondary'}>
                      {t(label)}
                    </Text>
                    {canReorder ? (
                      <Pressable onPress={() => setReordering((v) => !v)} hitSlop={6}>
                        <Text
                          variant="caption"
                          style={{ color: colors.primaryDark, fontWeight: '700' }}
                        >
                          {reordering ? t('common.done') : t('tasks.reorder')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {showReorder
                    ? list.map((task, index) => (
                        <ReorderRow
                          key={task.id}
                          task={task}
                          isFirst={index === 0}
                          isLast={index === list.length - 1}
                          onUp={() => onMove(list, task, -1)}
                          onDown={() => onMove(list, task, 1)}
                        />
                      ))
                    : list.map(renderTask)}
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
