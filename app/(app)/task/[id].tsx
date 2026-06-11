import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';

import { PRIORITY_META } from '@/domain/constants';
import { formatDueLabel } from '@/domain/format';
import type { Subtask } from '@/domain/types';
import { useCategories } from '@/features/categories/useCategories';
import { useCelebration } from '@/features/celebration/CelebrationProvider';
import { useTasks } from '@/features/tasks/useTasks';
import { useNow } from '@/hooks/useNow';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { deleteTask, setSubtasks } from '@/services/firestore/tasks';
import { useHousehold } from '@/services/household/HouseholdProvider';
import {
  completeTaskFlow,
  nudgeTaskFlow,
  reopenTaskFlow,
} from '@/services/workflows/taskWorkflows';
import { Avatar, Button, Card, Checkbox, EmptyState, Icon, Screen, Text } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { spacing } from '@/ui/theme/spacing';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const now = useNow();
  const { user } = useAuth();
  const { celebrate } = useCelebration();
  const { household, members } = useHousehold();
  const tasks = useTasks(household?.id ?? null);
  const categories = useCategories(household?.id ?? null);

  const task = useMemo(() => (tasks ?? []).find((item) => item.id === id) ?? null, [tasks, id]);
  const category = useMemo(
    () => (task?.categoryId ? (categories ?? []).find((c) => c.id === task.categoryId) : null),
    [categories, task],
  );
  const assignees = useMemo(
    () => members.filter((m) => task?.assigneeIds.includes(m.userId)),
    [members, task],
  );
  const completedByName = useMemo(
    () => members.find((m) => m.userId === task?.completedBy)?.displayName,
    [members, task],
  );

  if (tasks == null) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (!task || !household) {
    return (
      <Screen>
        <EmptyState expression="remind" title={t('tasks.notFound')} />
      </Screen>
    );
  }

  const gid = household.id;
  const done = task.status === 'done';

  const onToggleComplete = () => {
    if (!user) return;
    const actor = { uid: user.uid, name: user.displayName ?? 'Üye' };
    if (done) {
      reopenTaskFlow(task).catch((error) =>
        console.warn('[task] durum değiştirilemedi', error),
      );
    } else {
      completeTaskFlow({ task, actor, members })
        .then(celebrate)
        .catch((error) => console.warn('[task] durum değiştirilemedi', error));
    }
  };

  const onNudge = () => {
    if (!user) return;
    const actor = { uid: user.uid, name: user.displayName ?? 'Üye' };
    nudgeTaskFlow({ task, actor, members })
      .then(() => Alert.alert(t('common.appName'), t('tasks.nudgeSent')))
      .catch(() => Alert.alert(t('common.appName'), t('common.error')));
  };

  const onToggleSubtask = (subtask: Subtask) => {
    const next = task.subtasks.map((s) =>
      s.id === subtask.id ? { ...s, done: !s.done } : s,
    );
    setSubtasks(gid, task.id, next).catch((error) =>
      console.warn('[task] alt görev güncellenemedi', error),
    );
  };

  const onDelete = () => {
    Alert.alert(t('tasks.deleteTitle'), t('tasks.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteTask(gid, task.id)
            .then(() => router.back())
            .catch(() => Alert.alert(t('common.appName'), t('common.error')));
        },
      },
    ]);
  };

  return (
    <Screen padded={false} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              <Pressable
                hitSlop={8}
                accessibilityLabel={t('common.edit')}
                onPress={() => router.push({ pathname: '/task-form', params: { id: task.id } })}
              >
                <Icon name="pencil" size={20} color={colors.primaryDark} />
              </Pressable>
              <Pressable hitSlop={8} accessibilityLabel={t('common.delete')} onPress={onDelete}>
                <Icon name="trash" size={20} color={colors.danger} />
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing.sm }}>
          <Text
            variant="h1"
            style={done && { textDecorationLine: 'line-through', color: colors.textMuted }}
          >
            {task.title}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center' }}>
            {task.dueAtMs != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Icon name="calendar" size={16} color={colors.textSecondary} />
                <Text variant="small" tone="secondary">
                  {formatDueLabel(task.dueAtMs, task.hasTime, now)}
                </Text>
              </View>
            ) : null}
            {category ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: category.color }} />
                <Text variant="small" tone="secondary">
                  {category.name}
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: PRIORITY_META[task.priority].color,
                }}
              />
              <Text variant="small" tone="secondary">
                {PRIORITY_META[task.priority].labelTr}
              </Text>
            </View>
          </View>

          {done && completedByName ? (
            <Text variant="caption" tone="muted">
              {t('tasks.completedBy', { name: completedByName })}
            </Text>
          ) : null}
        </View>

        {task.description ? (
          <Card padded>
            <Text variant="body" tone="secondary">
              {task.description}
            </Text>
          </Card>
        ) : null}

        {assignees.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="overline" tone="secondary">
              {t('tasks.assignees')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {assignees.map((member) => (
                <View
                  key={member.userId}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
                >
                  <Avatar
                    name={member.displayName}
                    photoUrl={member.photoUrl}
                    seed={member.userId}
                    size={28}
                  />
                  <Text variant="small">{member.displayName.split(' ')[0]}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {task.subtasks.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="overline" tone="secondary">
              {t('tasks.subtasks')}
            </Text>
            {task.subtasks.map((subtask) => (
              <View
                key={subtask.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: spacing.md,
                }}
              >
                <Checkbox checked={subtask.done} onToggle={() => onToggleSubtask(subtask)} size={24} />
                <Text
                  variant="body"
                  style={[
                    { flex: 1 },
                    subtask.done && { textDecorationLine: 'line-through', color: colors.textMuted },
                  ]}
                >
                  {subtask.title}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        <View style={{ gap: spacing.sm }}>
          {!done && members.length > 1 ? (
            <Button title={t('tasks.nudge')} variant="ghost" onPress={onNudge} />
          ) : null}
          <Button
            title={done ? t('tasks.reopen') : t('tasks.complete')}
            variant={done ? 'secondary' : 'primary'}
            onPress={onToggleComplete}
            leftSlot={
              done ? undefined : (
                <Icon name="check" size={20} color={colors.onPrimary} strokeWidth={3} />
              )
            }
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
