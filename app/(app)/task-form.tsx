import { randomUUID } from 'expo-crypto';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { CALENDAR_WEEKDAYS_TR, PRIORITY_META } from '@/domain/constants';
import { formatDayKey } from '@/domain/format';
import { pointsForTask } from '@/domain/gamification';
import { dayKeyFromMs } from '@/domain/time';
import type { ClockTime, DayKey, Priority, Subtask, Task } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { useCategories } from '@/features/categories/useCategories';
import { useTasks } from '@/features/tasks/useTasks';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import { addCategory } from '@/services/firestore/categories';
import { updateTask, type NewTaskInput } from '@/services/firestore/tasks';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { createTaskFlow } from '@/services/workflows/taskWorkflows';
import {
  Avatar,
  Button,
  Calendar,
  Chip,
  Icon,
  Screen,
  Text,
  TextField,
  TimeWheel,
} from '@/ui';
import { colors, palette } from '@/ui/theme/colors';
import { radii } from '@/ui/theme/radii';
import { spacing } from '@/ui/theme/spacing';

type RecurrenceChoice = 'none' | 'daily' | 'weekdays' | 'weekly' | 'interval' | 'monthly';

/** Haftalık gün seçimi: görüntü sırası Pzt..Paz, değerler JS getDay (0=Paz). */
const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 0] as const;

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
const NEW_CATEGORY_COLORS = [
  palette.teal[500],
  palette.coral[500],
  palette.gold[500],
  palette.teal[700],
];

export default function TaskFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { household } = useHousehold();
  const tasks = useTasks(household?.id ?? null);

  // Düzenleme modunda formu, görev verisi gelmeden kurma.
  if (id && tasks == null) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  const editing = id ? (tasks ?? []).find((task) => task.id === id) ?? null : null;
  return <TaskFormInner key={editing?.id ?? 'new'} editing={editing} />;
}

function TaskFormInner({ editing }: { editing: Task | null }) {
  const router = useRouter();
  const { user } = useAuth();
  const { household, members } = useHousehold();
  const categories = useCategories(household?.id ?? null) ?? [];

  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'medium');
  const [dayKey, setDayKey] = useState<DayKey | null>(
    editing?.dueAtMs != null ? dayKeyFromMs(editing.dueAtMs) : null,
  );
  const [time, setTime] = useState<ClockTime | null>(
    editing?.hasTime && editing.dueAtMs != null
      ? {
          hour: new Date(editing.dueAtMs).getHours(),
          minute: new Date(editing.dueAtMs).getMinutes(),
        }
      : null,
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceChoice>('none');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [intervalN, setIntervalN] = useState(2);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(editing?.assigneeIds ?? []);
  const [subtasks, setSubtasks] = useState<Subtask[]>(editing?.subtasks ?? []);
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [saving, setSaving] = useState(false);

  const now = useNow();
  const today = dayKeyFromMs(now);
  const tomorrow = dayKeyFromMs(now + 86_400_000);

  const toggleAssignee = (uid: string) => {
    setAssigneeIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid],
    );
  };

  const addSubtaskDraft = () => {
    const text = subtaskDraft.trim();
    if (!text) return;
    setSubtasks((prev) => [...prev, { id: randomUUID(), title: text, done: false }]);
    setSubtaskDraft('');
  };

  const removeSubtask = (sid: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== sid));
  };

  const onAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || !household) return;
    try {
      const color = NEW_CATEGORY_COLORS[categories.length % NEW_CATEGORY_COLORS.length];
      const cid = await addCategory(household.id, name, color);
      setCategoryId(cid);
      setNewCategoryName('');
      setShowNewCategory(false);
    } catch (error) {
      console.warn('[task-form] kategori eklenemedi', error);
      Alert.alert(t('common.appName'), t('common.error'));
    }
  };

  const toggleWeeklyDay = (day: number) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const onSave = async () => {
    if (!household || !user) return;
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert(t('common.appName'), t('tasks.titleRequired'));
      return;
    }

    let dueAtMs: number | undefined;
    let hasTime = false;
    if (dayKey) {
      const [y, m, d] = dayKey.split('-').map(Number);
      if (time) {
        dueAtMs = new Date(y, m - 1, d, time.hour, time.minute).getTime();
        hasTime = true;
      } else {
        dueAtMs = new Date(y, m - 1, d, 12, 0).getTime();
      }
    }

    setSaving(true);
    try {
      if (editing) {
        await updateTask(household.id, editing.id, {
          title: trimmed,
          description: description.trim() || undefined,
          clearDescription: !description.trim() && Boolean(editing.description),
          categoryId: categoryId ?? undefined,
          clearCategory: !categoryId && Boolean(editing.categoryId),
          priority,
          dueAtMs,
          hasTime,
          clearDueDate: dueAtMs == null && editing.dueAtMs != null,
          assigneeIds,
          subtasks,
          points: pointsForTask(priority),
        });
      } else {
        const input: NewTaskInput = {
          householdId: household.id,
          title: trimmed,
          description: description.trim() || undefined,
          categoryId: categoryId ?? undefined,
          priority,
          status: 'open',
          dueAtMs,
          hasTime,
          assigneeIds,
          subtasks,
          points: pointsForTask(priority),
          createdBy: user.uid,
        };

        const startDayKey = dayKey ?? today;
        const recurrenceBase = { startDayKey, time: time ?? undefined, active: true };
        const recurrenceInput =
          recurrence === 'none'
            ? null
            : recurrence === 'daily'
              ? { frequency: 'daily' as const, ...recurrenceBase }
              : recurrence === 'weekdays'
                ? { frequency: 'weekly' as const, weekdays: [1, 2, 3, 4, 5], ...recurrenceBase }
                : recurrence === 'weekly'
                  ? {
                      frequency: 'weekly' as const,
                      weekdays: weeklyDays.length > 0 ? weeklyDays : undefined,
                      ...recurrenceBase,
                    }
                  : recurrence === 'interval'
                    ? { frequency: 'interval' as const, interval: intervalN, ...recurrenceBase }
                    : {
                        frequency: 'monthly' as const,
                        monthDay: Number(startDayKey.slice(-2)),
                        ...recurrenceBase,
                      };

        await createTaskFlow({
          task: input,
          recurrence: recurrenceInput,
          actor: { uid: user.uid, name: user.displayName ?? 'Üye' },
          members,
        });
      }
      router.back();
    } catch (error) {
      console.warn('[task-form] kaydedilemedi', error);
      Alert.alert(t('common.appName'), t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll padded edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: editing ? t('tasks.editTask') : t('tasks.newTask') }} />

      <View style={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <TextField
          value={title}
          onChangeText={setTitle}
          placeholder={t('tasks.titlePlaceholder')}
          autoFocus={!editing}
          returnKeyType="next"
        />
        <TextField
          value={description}
          onChangeText={setDescription}
          placeholder={t('tasks.descriptionPlaceholder')}
          multiline
        />

        {/* Kategori */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="secondary">
            {t('tasks.category')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name}
                dotColor={cat.color}
                selected={categoryId === cat.id}
                onPress={() => setCategoryId((prev) => (prev === cat.id ? null : cat.id))}
              />
            ))}
            <Chip
              label={`+ ${t('tasks.addCategory')}`}
              selected={showNewCategory}
              onPress={() => setShowNewCategory((v) => !v)}
            />
          </View>
          {showNewCategory ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder={t('tasks.categoryNamePlaceholder')}
                  returnKeyType="done"
                  onSubmitEditing={() => void onAddCategory()}
                />
              </View>
              <Button
                title={t('common.add')}
                fullWidth={false}
                size="md"
                style={{ height: 50 }}
                onPress={() => void onAddCategory()}
                disabled={newCategoryName.trim().length === 0}
              />
            </View>
          ) : null}
        </View>

        {/* Öncelik */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="secondary">
            {t('tasks.priority')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {PRIORITIES.map((p) => (
              <Chip
                key={p}
                label={PRIORITY_META[p].labelTr}
                dotColor={PRIORITY_META[p].color}
                selected={priority === p}
                onPress={() => setPriority(p)}
              />
            ))}
          </View>
        </View>

        {/* Tarih */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="secondary">
            {t('tasks.dueDate')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Chip
              label={t('tasks.noDueDate')}
              selected={dayKey === null}
              onPress={() => {
                setDayKey(null);
                setTime(null);
                setShowCalendar(false);
              }}
            />
            <Chip label={t('tasks.today')} selected={dayKey === today} onPress={() => setDayKey(today)} />
            <Chip
              label={t('tasks.tomorrow')}
              selected={dayKey === tomorrow}
              onPress={() => setDayKey(tomorrow)}
            />
            <Chip
              label={
                dayKey && dayKey !== today && dayKey !== tomorrow
                  ? formatDayKey(dayKey)
                  : t('tasks.pickDate')
              }
              selected={showCalendar || Boolean(dayKey && dayKey !== today && dayKey !== tomorrow)}
              onPress={() => setShowCalendar((v) => !v)}
            />
          </View>

          {showCalendar ? (
            <Calendar
              selected={dayKey}
              onSelect={(key) => {
                setDayKey(key);
                setShowCalendar(false);
              }}
            />
          ) : null}

          {dayKey ? (
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Chip
                  label={time ? t('tasks.time') : t('tasks.addTime')}
                  leftSlot={<Icon name="clock" size={14} color={time ? colors.primaryDark : colors.textMuted} />}
                  selected={time !== null}
                  onPress={() => setTime((prev) => (prev ? null : { hour: 9, minute: 0 }))}
                />
              </View>
              {time ? <TimeWheel value={time} onChange={setTime} /> : null}
            </View>
          ) : null}
        </View>

        {/* Tekrar (yalnızca yeni görevde; kural düzenleme sonraki aşamada) */}
        {!editing ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="overline" tone="secondary">
              {t('tasks.recurrence')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Chip
                label={t('tasks.recurrenceNone')}
                selected={recurrence === 'none'}
                onPress={() => setRecurrence('none')}
              />
              <Chip
                label={t('tasks.recurrenceDaily')}
                selected={recurrence === 'daily'}
                onPress={() => setRecurrence('daily')}
              />
              <Chip
                label={t('tasks.recurrenceWeekdays')}
                selected={recurrence === 'weekdays'}
                onPress={() => setRecurrence('weekdays')}
              />
              <Chip
                label={t('tasks.recurrenceWeekly')}
                selected={recurrence === 'weekly'}
                onPress={() => setRecurrence('weekly')}
              />
              <Chip
                label={t('tasks.recurrenceEveryN', { n: intervalN })}
                selected={recurrence === 'interval'}
                onPress={() => setRecurrence('interval')}
              />
              <Chip
                label={t('tasks.recurrenceMonthly')}
                selected={recurrence === 'monthly'}
                onPress={() => setRecurrence('monthly')}
              />
            </View>

            {recurrence === 'weekly' ? (
              <View style={{ gap: spacing.xs }}>
                <Text variant="caption" tone="muted">
                  {t('tasks.recurrenceWeeklyHint')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  {WEEKDAY_VALUES.map((day, index) => (
                    <Chip
                      key={day}
                      label={CALENDAR_WEEKDAYS_TR[index]}
                      selected={weeklyDays.includes(day)}
                      onPress={() => toggleWeeklyDay(day)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {recurrence === 'interval' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Pressable
                  hitSlop={8}
                  accessibilityLabel="-"
                  onPress={() => setIntervalN((n) => Math.max(2, n - 1))}
                >
                  <Icon name="minus" size={22} color={colors.primaryDark} />
                </Pressable>
                <Text variant="h2">{intervalN}</Text>
                <Pressable
                  hitSlop={8}
                  accessibilityLabel="+"
                  onPress={() => setIntervalN((n) => Math.min(30, n + 1))}
                >
                  <Icon name="plus" size={22} color={colors.primaryDark} />
                </Pressable>
                <Text variant="small" tone="secondary">
                  {t('tasks.recurrenceIntervalSuffix')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Atananlar */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="secondary">
            {t('tasks.assignees')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {members.map((member) => (
              <Chip
                key={member.userId}
                label={member.displayName.split(' ')[0]}
                selected={assigneeIds.includes(member.userId)}
                onPress={() => toggleAssignee(member.userId)}
                leftSlot={
                  <Avatar
                    name={member.displayName}
                    photoUrl={member.photoUrl}
                    seed={member.userId}
                    size={20}
                  />
                }
              />
            ))}
          </View>
        </View>

        {/* Alt görevler */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="secondary">
            {t('tasks.subtasks')}
          </Text>
          {subtasks.map((subtask) => (
            <View
              key={subtask.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radii.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <Icon name="list" size={16} color={colors.textMuted} />
              <Text variant="body" style={{ flex: 1 }}>
                {subtask.title}
              </Text>
              <Pressable hitSlop={8} onPress={() => removeSubtask(subtask.id)}>
                <Icon name="x" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField
                value={subtaskDraft}
                onChangeText={setSubtaskDraft}
                placeholder={t('tasks.subtaskPlaceholder')}
                returnKeyType="done"
                onSubmitEditing={addSubtaskDraft}
              />
            </View>
            <Button
              title={t('common.add')}
              fullWidth={false}
              size="md"
              variant="secondary"
              style={{ height: 50 }}
              onPress={addSubtaskDraft}
              disabled={subtaskDraft.trim().length === 0}
            />
          </View>
        </View>

        <Button title={t('common.save')} onPress={() => void onSave()} loading={saving} />
      </View>
    </Screen>
  );
}

