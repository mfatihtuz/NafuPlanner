import { Alert } from 'react-native';

import { reopenNeedsApproval } from '@/domain/tasks';
import type { Member, Task } from '@/domain/types';
import { t } from '@/i18n';
import { firestoreErrorMessage } from '@/services/firestore/errors';
import { reopenTaskFlow, requestReopenTaskFlow } from '@/services/workflows/taskWorkflows';

/**
 * Geri açma kapısı — tamamlanmış göreve "geri aç" dokunuşlarının TEK girişi
 * (görev detayı + Bugün/Görevler/Takvim kartları). Puan hırsızlığına ve
 * yanlış tıklamaya karşı: başkasının tamamladığı görevde önce diğer
 * üyelerden onay istenir; kendi tamamladığın görev doğrudan geri açılır.
 */
export function reopenTaskGate(
  task: Task,
  actor: { uid: string; name: string },
  members: Member[],
): void {
  if (task.reopenRequestedBy) {
    Alert.alert(t('common.appName'), t('tasks.reopenAlreadyPending'));
    return;
  }

  if (!reopenNeedsApproval(task, actor.uid, members.length)) {
    reopenTaskFlow(task).catch((error) =>
      Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error'))),
    );
    return;
  }

  const completerName =
    members.find((m) => m.userId === task.completedBy)?.displayName.split(' ')[0] ?? t('common.member');
  Alert.alert(
    t('tasks.reopenNeedsApprovalTitle'),
    t('tasks.reopenNeedsApprovalBody', { name: completerName }),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('tasks.reopenRequestAction'),
        onPress: () => {
          requestReopenTaskFlow({ task, actor, members })
            .then(() => Alert.alert(t('common.appName'), t('tasks.reopenRequestSent')))
            .catch((error) =>
              Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error'))),
            );
        },
      },
    ],
  );
}
