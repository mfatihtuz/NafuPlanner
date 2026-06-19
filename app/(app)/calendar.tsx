import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { actorOf } from '@/services/auth/actor';
import { useMemberMap } from '@/features/household/useMemberMap';
import { dayKeyFromMs, todayKey } from '@/domain/time';
import type { Task } from '@/domain/types';
import { useCategories } from '@/features/categories/useCategories';
import { useCelebration } from '@/features/celebration/CelebrationProvider';
import { TaskCard } from '@/features/tasks/TaskCard';
import { useTasks } from '@/features/tasks/useTasks';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { reopenTaskGate } from '@/features/tasks/reopenTask';
import { completeTaskGate } from '@/features/tasks/completeTask';
import { deleteTaskGate, reassignTaskGate, snoozeTaskGate } from '@/features/tasks/quickActions';
import { Calendar, Screen, Text } from '@/ui';
import { spacing } from '@/ui/theme/spacing';

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { celebrate } = useCelebration();
  const { household, members } = useHousehold();
  const tasks = useTasks(household?.id ?? null);
  const categories = useCategories(household?.id ?? null);
  const [selected, setSelected] = useState<string>(todayKey());

  // Görevi olan günler (takvimde nokta).
  const markedDays = useMemo(() => {
    const set = new Set<string>();
    (tasks ?? []).forEach((task) => {
      if (task.dueAtMs != null) set.add(dayKeyFromMs(task.dueAtMs));
    });
    return set;
  }, [tasks]);

  const dayTasks = useMemo(
    () =>
      (tasks ?? []).filter(
        (task) => task.dueAtMs != null && dayKeyFromMs(task.dueAtMs) === selected,
      ),
    [tasks, selected],
  );

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

  return (
    <Screen scroll padded edges={['left', 'right', 'bottom']}>
      <View style={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <Calendar selected={selected} onSelect={setSelected} markedDays={markedDays} />
        {dayTasks.length === 0 ? (
          <Text variant="caption" tone="muted" center>
            {t('calendar.empty')}
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {dayTasks.map((task) => (
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
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
