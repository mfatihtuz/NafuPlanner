import { randomUUID } from 'expo-crypto';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { PRIORITY_META } from '@/domain/constants';
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
import { createTask, updateTask } from '@/services/firestore/tasks';
import { useHousehold } from '@/services/household/HouseholdProvider';
import {
  Avatar,
  Button,
  Calendar,
  Chip,
  Icon,
  Screen,
  Text,
  TextField,
} from '@/ui';
import { colors, palette } from '@/ui/theme/colors';
import { radii } from '@/ui/theme/radii';
import { spacing } from '@/ui/theme/spacing';

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

  const stepTime = (field: 'hour' | 'minute', delta: number) => {
    setTime((prev) => {
      const base = prev ?? { hour: 9, minute: 0 };
      if (field === 'hour') return { ...base, hour: (base.hour + delta + 24) % 24 };
      return { ...base, minute: (base.minute + delta + 60) % 60 };
    });
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
        await createTask({
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
              {time ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.lg,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                    padding: spacing.md,
                  }}
                >
                  <TimeStepper
                    value={String(time.hour).padStart(2, '0')}
                    onUp={() => stepTime('hour', 1)}
                    onDown={() => stepTime('hour', -1)}
                  />
                  <Text variant="h2">:</Text>
                  <TimeStepper
                    value={String(time.minute).padStart(2, '0')}
                    onUp={() => stepTime('minute', 15)}
                    onDown={() => stepTime('minute', -15)}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

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

function TimeStepper({
  value,
  onUp,
  onDown,
}: {
  value: string;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      <Pressable hitSlop={8} onPress={onUp} accessibilityLabel="+">
        <Icon name="plus" size={20} color={colors.primaryDark} />
      </Pressable>
      <Text variant="h2">{value}</Text>
      <Pressable hitSlop={8} onPress={onDown} accessibilityLabel="-">
        <Icon name="minus" size={20} color={colors.primaryDark} />
      </Pressable>
    </View>
  );
}
