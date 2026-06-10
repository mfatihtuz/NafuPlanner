import { Pressable, View } from 'react-native';

import { PRIORITY_META } from '@/domain/constants';
import { formatDueLabel } from '@/domain/format';
import { subtaskProgress } from '@/domain/tasks';
import type { Category, Member, Task } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { t } from '@/i18n';
import { Avatar, Checkbox, Text } from '@/ui';
import { colors } from '@/ui/theme/colors';
import { radii } from '@/ui/theme/radii';
import { shadows } from '@/ui/theme/shadows';
import { spacing } from '@/ui/theme/spacing';

export interface TaskCardProps {
  task: Task;
  category?: Category | null;
  assignees?: Member[];
  onToggleComplete: (task: Task) => void;
  onPress: (task: Task) => void;
}

export function TaskCard({ task, category, assignees = [], onToggleComplete, onPress }: TaskCardProps) {
  const done = task.status === 'done';
  const now = useNow();
  const overdue =
    !done &&
    task.dueAtMs != null &&
    task.dueAtMs < now &&
    formatDueLabel(task.dueAtMs, false, now) !== 'Bugün';
  const [subDone, subTotal] = subtaskProgress(task);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(task)}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          gap: spacing.md,
        },
        shadows.sm,
        pressed && { opacity: 0.92 },
      ]}
    >
      <Checkbox checked={done} onToggle={() => onToggleComplete(task)} />

      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text
          variant="bodyStrong"
          numberOfLines={2}
          style={done && { textDecorationLine: 'line-through', color: colors.textMuted }}
        >
          {task.title}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }}>
          {task.dueAtMs != null ? (
            <Text
              variant="caption"
              style={{ color: overdue ? colors.danger : colors.textSecondary, fontWeight: overdue ? '700' : '500' }}
            >
              {formatDueLabel(task.dueAtMs, task.hasTime, now)}
            </Text>
          ) : null}

          {category ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: category.color }} />
              <Text variant="caption" tone="muted">
                {category.name}
              </Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: PRIORITY_META[task.priority].color,
              }}
            />
            <Text variant="caption" tone="muted">
              {PRIORITY_META[task.priority].labelTr}
            </Text>
          </View>

          {subTotal > 0 ? (
            <Text variant="caption" tone="muted">
              {t('tasks.subtaskProgress', { done: subDone, total: subTotal })}
            </Text>
          ) : null}
        </View>
      </View>

      {assignees.length > 0 ? (
        <View style={{ flexDirection: 'row' }}>
          {assignees.slice(0, 3).map((member, index) => (
            <View key={member.userId} style={{ marginLeft: index === 0 ? 0 : -10 }}>
              <Avatar name={member.displayName} photoUrl={member.photoUrl} seed={member.userId} size={28} />
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}
