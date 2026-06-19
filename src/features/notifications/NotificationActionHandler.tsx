import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { dayKeyFromMs } from '@/domain/time';
import type { Member } from '@/domain/types';
import { actorOf } from '@/services/auth/actor';
import { useAuth } from '@/services/auth/AuthProvider';
import { getTask } from '@/services/firestore/tasks';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { NOTIF_ACTION } from '@/services/notifications/categories';
import {
  approveCompleteTaskFlow,
  completeTaskFlow,
  rejectCompleteTaskFlow,
  snoozeTaskFlow,
} from '@/services/workflows/taskWorkflows';

async function runAction(
  action: string,
  data: { gid?: string; taskId?: string },
  user: { uid: string; displayName?: string | null },
  members: Member[],
): Promise<void> {
  if (!data.gid || !data.taskId) return;
  const task = await getTask(data.gid, data.taskId);
  if (!task) return;
  const actor = actorOf(user);
  switch (action) {
    case NOTIF_ACTION.complete:
      // Bildirim alıcısı atanan kişidir → onaya gerek yok; doğrudan tamamla.
      if (task.status !== 'done' && !task.pendingCompleteBy) {
        await completeTaskFlow({ task, actor, members });
      }
      break;
    case NOTIF_ACTION.snooze:
      await snoozeTaskFlow(task, dayKeyFromMs(Date.now() + 86_400_000));
      break;
    case NOTIF_ACTION.approve:
      await approveCompleteTaskFlow({ task, actor, members });
      break;
    case NOTIF_ACTION.reject:
      await rejectCompleteTaskFlow({ task, actor, members });
      break;
    default:
      break;
  }
}

/**
 * (7) Bildirim aksiyon işleyici: kullanıcı bildirimdeki Tamamla/Ertele/Onayla/
 * Reddet butonuna basınca ilgili akışı çalıştırır. Aksiyonlar uygulamayı öne
 * getirir (opensAppToForeground), böylece oturum + Firestore hazırdır. Düz
 * dokunuş (DEFAULT_ACTION) yalnızca uygulamayı açar; burada bir şey yapılmaz.
 */
export function NotificationActionHandler() {
  const { user } = useAuth();
  const { members } = useHousehold();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const action = response.actionIdentifier;
      if (action === Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      if (!user) return;
      const data = (response.notification.request.content.data ?? {}) as {
        gid?: string;
        taskId?: string;
      };
      void runAction(action, data, user, members).catch((error) =>
        console.warn('[push] bildirim aksiyonu çalıştırılamadı', error),
      );
    });
    return () => sub.remove();
  }, [user, members]);

  return null;
}
