import { Alert } from 'react-native';

import { completionNeedsApproval } from '@/domain/tasks';
import type { Member, Task } from '@/domain/types';
import { t } from '@/i18n';
import { firestoreErrorMessage } from '@/services/firestore/errors';
import {
  completeTaskFlow,
  requestCompleteTaskFlow,
  type CompletionReward,
} from '@/services/workflows/taskWorkflows';

/**
 * Tamamlama kapısı — açık göreve "tamamla" dokunuşlarının TEK girişi (Bugün/
 * Görevler/Takvim kartları + görev detayı). Göreve atanmamış biri, başkasına
 * atanmış görevi tamamlamaya çalışırsa doğrudan tamamlamak yerine ATANAN'ın
 * onayına gönderilir; aksi halde (atanmamış görev veya kendi görevin) doğrudan
 * tamamlanır ve kutlama gösterilir.
 */
export function completeTaskGate(
  task: Task,
  actor: { uid: string; name: string },
  members: Member[],
  celebrate: (reward: CompletionReward | null) => void,
): void {
  if (task.pendingCompleteBy) {
    Alert.alert(t('common.appName'), t('tasks.completeAlreadyPending'));
    return;
  }

  if (!completionNeedsApproval(task, actor.uid, members.length)) {
    completeTaskFlow({ task, actor, members })
      .then(celebrate)
      .catch((error) =>
        Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error'))),
      );
    return;
  }

  const assigneeName =
    members.find((m) => task.assigneeIds.includes(m.userId))?.displayName.split(' ')[0] ??
    t('common.member');
  Alert.alert(
    t('tasks.completeNeedsApprovalTitle'),
    t('tasks.completeNeedsApprovalBody', { name: assigneeName }),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('tasks.completeRequestAction'),
        onPress: () => {
          requestCompleteTaskFlow({ task, actor, members })
            .then(() => Alert.alert(t('common.appName'), t('tasks.completeRequestSent')))
            .catch((error) =>
              Alert.alert(t('common.appName'), firestoreErrorMessage(error, t('common.error'))),
            );
        },
      },
    ],
  );
}
