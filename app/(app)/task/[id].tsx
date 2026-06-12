import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  View,
} from 'react-native';

import { PRIORITY_META } from '@/domain/constants';
import { formatDueLabel } from '@/domain/format';
import type { Attachment, Subtask } from '@/domain/types';
import { useCategories } from '@/features/categories/useCategories';
import { useCelebration } from '@/features/celebration/CelebrationProvider';
import { useTasks } from '@/features/tasks/useTasks';
import { useNow } from '@/hooks/useNow';
import { t } from '@/i18n';
import { useAuth } from '@/services/auth/AuthProvider';
import {
  addAttachment,
  removeAttachment,
  watchAttachments,
} from '@/services/firestore/attachments';
import { watchComments } from '@/services/firestore/comments';
import { firestoreErrorMessage } from '@/services/firestore/errors';
import { deleteTask, setSubtasks } from '@/services/firestore/tasks';
import { useWatch } from '@/services/firestore/useWatch';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { deleteStorageObject, uploadTaskImage } from '@/services/storage/attachments';
import {
  commentTaskFlow,
  completeTaskFlow,
  nudgeTaskFlow,
  reopenTaskFlow,
} from '@/services/workflows/taskWorkflows';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Icon,
  KeyboardAwareScrollView,
  Screen,
  Text,
  TextField,
} from '@/ui';
import { colors } from '@/ui/theme/colors';
import { radii } from '@/ui/theme/radii';
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
  const commentsKey = household && id ? `${household.id}/${id}` : null;
  const comments = useWatch(commentsKey, watchComments);
  const attachments = useWatch(commentsKey, watchAttachments);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);
  const [commentDraft, setCommentDraft] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const onAddPhoto = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('common.appName'), t('attachments.permission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setUploading(true);
    try {
      const uploaded = await uploadTaskImage(gid, task.id, asset.uri);
      await addAttachment(gid, task.id, { ...uploaded, uploadedBy: user.uid });
    } catch (error) {
      console.warn('[task] foto yüklenemedi', error);
      const code = (error as { code?: string }).code ?? '';
      Alert.alert(
        t('common.appName'),
        code.includes('unauthorized')
          ? t('attachments.errUnauthorized')
          : t('attachments.uploadError'),
      );
    } finally {
      setUploading(false);
    }
  };

  const onRemovePhoto = (att: Attachment) => {
    Alert.alert(t('attachments.deleteTitle'), t('attachments.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          removeAttachment(gid, task.id, att.id).catch((error) =>
            console.warn('[task] ek silinemedi', error),
          );
          void deleteStorageObject(att.storagePath);
        },
      },
    ]);
  };

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
      .catch((error) =>
        Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error'))),
      );
  };

  const onSendComment = () => {
    const body = commentDraft.trim();
    if (!body || !user || sendingComment) return;
    const actor = { uid: user.uid, name: user.displayName ?? 'Üye' };
    setSendingComment(true);
    setCommentDraft('');
    commentTaskFlow({ task, body, actor, members })
      .catch((error) => {
        setCommentDraft(body);
        Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error')));
      })
      .finally(() => setSendingComment(false));
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
            .catch((error) =>
              Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error'))),
            );
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

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, flexGrow: 1 }}
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

        {/* Fotoğraflar */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="secondary">
            {t('attachments.title')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {(attachments ?? []).map((att) => (
              <Pressable key={att.id} onLongPress={() => onRemovePhoto(att)}>
                <Image
                  source={{ uri: att.url }}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: radii.md,
                    backgroundColor: colors.surface,
                  }}
                />
              </Pressable>
            ))}
            <Pressable
              onPress={() => void onAddPhoto()}
              disabled={uploading}
              accessibilityLabel={t('attachments.add')}
              style={{
                width: 96,
                height: 96,
                borderRadius: radii.md,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
              }}
            >
              {uploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Icon name="plus" size={24} color={colors.primaryDark} />
              )}
            </Pressable>
          </View>
          {(attachments ?? []).length > 0 ? (
            <Text variant="caption" tone="muted">
              {t('attachments.removeHint')}
            </Text>
          ) : null}
        </View>

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

        {/* Yorumlar */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="secondary">
            {t('comments.title')}
            {comments && comments.length > 0 ? ` (${comments.length})` : ''}
          </Text>

          {comments == null ? null : comments.length === 0 ? (
            <Text variant="caption" tone="muted">
              {t('comments.empty')}
            </Text>
          ) : (
            comments.map((comment) => {
              const author = memberMap.get(comment.authorId);
              return (
                <View
                  key={comment.id}
                  style={{
                    flexDirection: 'row',
                    gap: spacing.sm,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                    padding: spacing.md,
                  }}
                >
                  <Avatar
                    name={author?.displayName ?? '?'}
                    photoUrl={author?.photoUrl}
                    seed={comment.authorId}
                    size={28}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text variant="small" style={{ fontWeight: '700' }}>
                        {(author?.displayName ?? 'Üye').split(' ')[0]}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {formatDueLabel(comment.createdAtMs, true, now)}
                      </Text>
                    </View>
                    <Text variant="small">{comment.body}</Text>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <TextField
                value={commentDraft}
                onChangeText={setCommentDraft}
                placeholder={t('comments.placeholder')}
                returnKeyType="send"
                onSubmitEditing={onSendComment}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.add')}
              onPress={onSendComment}
              disabled={commentDraft.trim().length === 0 || sendingComment}
              style={({ pressed }) => ({
                width: 50,
                height: 50,
                borderRadius: 25,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  commentDraft.trim().length === 0 ? colors.border : colors.primary,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Icon name="send" size={20} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>

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
      </KeyboardAwareScrollView>
    </Screen>
  );
}
