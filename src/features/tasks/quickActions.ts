import { Alert, type AlertButton } from 'react-native';

import { snoozeDayKeys } from '@/domain/tasks';
import type { Member, Task } from '@/domain/types';
import { t } from '@/i18n';
import { firestoreErrorMessage } from '@/services/firestore/errors';
import { deleteTask } from '@/services/firestore/tasks';
import { reassignTaskFlow, snoozeTaskFlow } from '@/services/workflows/taskWorkflows';

const reportError = (error: unknown) =>
  Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error')));

/**
 * Hızlı erteleme kapısı (kart kaydırma): Yarın / Hafta sonu / Gelecek hafta
 * seçeneklerini sunar ve seçileni uygular.
 */
export function snoozeTaskGate(task: Task, now: number): void {
  const keys = snoozeDayKeys(now);
  Alert.alert(t('tasks.snoozeTitle'), undefined, [
    {
      text: t('tasks.snoozeTomorrow'),
      onPress: () => void snoozeTaskFlow(task, keys.tomorrow).catch(reportError),
    },
    {
      text: t('tasks.snoozeWeekend'),
      onPress: () => void snoozeTaskFlow(task, keys.weekend).catch(reportError),
    },
    {
      text: t('tasks.snoozeNextWeek'),
      onPress: () => void snoozeTaskFlow(task, keys.nextWeek).catch(reportError),
    },
    { text: t('common.cancel'), style: 'cancel' },
  ]);
}

/**
 * Hızlı devretme kapısı: göreve sahip olmayan üyeleri sunar. Tek aday varsa
 * yine de onay için liste gösterilir (yanlış dokunuş olmasın).
 */
export function reassignTaskGate(
  task: Task,
  actor: { uid: string; name: string },
  members: Member[],
): void {
  const soleAssignee = task.assigneeIds.length === 1 ? task.assigneeIds[0] : null;
  const candidates = members.filter((m) => m.userId !== soleAssignee);
  if (candidates.length === 0) return;

  const buttons: AlertButton[] = candidates.map((m) => ({
    text:
      m.userId === actor.uid
        ? t('tasks.reassignToMe')
        : m.displayName.split(' ')[0],
    onPress: () =>
      void reassignTaskFlow({ task, toUserId: m.userId, actor, members }).catch(reportError),
  }));
  buttons.push({ text: t('common.cancel'), style: 'cancel' });

  Alert.alert(t('tasks.reassignTitle'), t('tasks.reassignBody'), buttons);
}

/** Silme kapısı: onay ister, onaylanırsa görevi siler. */
export function deleteTaskGate(task: Task, onDeleted?: () => void): void {
  Alert.alert(t('tasks.deleteTitle'), t('tasks.deleteBody'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('common.delete'),
      style: 'destructive',
      onPress: () =>
        void deleteTask(task.householdId, task.id)
          .then(() => onDeleted?.())
          .catch(reportError),
    },
  ]);
}
