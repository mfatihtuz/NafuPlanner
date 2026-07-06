import { useRef, type ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { PRIORITY_META } from '@/domain/constants';
import { formatDueLabel } from '@/domain/format';
import { subtaskProgress } from '@/domain/tasks';
import type { Category, Member, Task } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { t } from '@/i18n';
import { Avatar, Checkbox, Icon, Text } from '@/ui';
import { useColors } from '@/ui/theme';
import { radii } from '@/ui/theme/radii';
import { rowCardSurface } from '@/ui/theme/rowCard';
import { shadows } from '@/ui/theme/shadows';
import { spacing } from '@/ui/theme/spacing';

export interface TaskCardProps {
  task: Task;
  category?: Category | null;
  assignees?: Member[];
  onToggleComplete: (task: Task) => void;
  onPress: (task: Task) => void;
  /** Kaydırma aksiyonları — verilirse karta hızlı erteleme/devretme/silme gelir. */
  onSnooze?: (task: Task) => void;
  onReassign?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

/** Kaydırınca beliren tek aksiyon düğmesi (ikon + etiket). */
function SwipeButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: ComponentProps<typeof Icon>['name'];
  label: string;
  color: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 74,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: color,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={20} color={colors.onPrimary} />
      <Text variant="caption" style={{ color: colors.onPrimary, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TaskCard({
  task,
  category,
  assignees = [],
  onToggleComplete,
  onPress,
  onSnooze,
  onReassign,
  onDelete,
}: TaskCardProps) {
  const colors = useColors();
  const done = task.status === 'done';
  const now = useNow();
  const swipeRef = useRef<Swipeable>(null);
  const overdue =
    !done &&
    task.dueAtMs != null &&
    task.dueAtMs < now &&
    formatDueLabel(task.dueAtMs, false, now) !== 'Bugün';
  const [subDone, subTotal] = subtaskProgress(task);

  // Aksiyon çalıştır: önce kaydırmayı kapat, sonra işlemi tetikle.
  const run = (fn?: (task: Task) => void) => {
    swipeRef.current?.close();
    fn?.(task);
  };

  const showLeft = !done;
  const showRight =
    Boolean(onDelete) || (!done && (Boolean(onSnooze) || Boolean(onReassign)));

  const card = (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(task)}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          ...rowCardSurface(true),
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

          {task.recurrenceId ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
              <Icon name="repeat" size={12} color={colors.textMuted} />
              <Text variant="caption" tone="muted">
                {t('tasks.recurrenceBadge')}
              </Text>
            </View>
          ) : null}

          {subTotal > 0 ? (
            <Text variant="caption" tone="muted">
              {t('tasks.subtaskProgress', { done: subDone, total: subTotal })}
            </Text>
          ) : null}

          {task.commentsCount > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
              <Icon name="message" size={12} color={colors.textMuted} />
              <Text variant="caption" tone="muted">
                {task.commentsCount}
              </Text>
            </View>
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

  // Hiç kaydırma aksiyonu yoksa düz kart (geriye dönük uyum).
  if (!showLeft && !showRight) return card;

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
      leftThreshold={56}
      rightThreshold={56}
      containerStyle={{ borderRadius: radii.lg }}
      renderLeftActions={
        showLeft
          ? () => (
              <View style={{ flexDirection: 'row' }}>
                <SwipeButton
                  icon="check"
                  label={t('tasks.complete')}
                  color={colors.success}
                  onPress={() => run(onToggleComplete)}
                />
              </View>
            )
          : undefined
      }
      renderRightActions={
        showRight
          ? () => (
              <View style={{ flexDirection: 'row' }}>
                {!done && onSnooze ? (
                  <SwipeButton
                    icon="clock"
                    label={t('tasks.snoozeAction')}
                    color={colors.warning}
                    onPress={() => run(onSnooze)}
                  />
                ) : null}
                {!done && onReassign ? (
                  <SwipeButton
                    icon="users"
                    label={t('tasks.reassignAction')}
                    color={colors.primary}
                    onPress={() => run(onReassign)}
                  />
                ) : null}
                {onDelete ? (
                  <SwipeButton
                    icon="trash"
                    label={t('common.delete')}
                    color={colors.danger}
                    onPress={() => run(onDelete)}
                  />
                ) : null}
              </View>
            )
          : undefined
      }
    >
      {card}
    </Swipeable>
  );
}
