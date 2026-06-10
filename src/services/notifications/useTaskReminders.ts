import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import type { Task } from '@/domain/types';
import { t } from '@/i18n';

/** iOS bekleyen bildirim sınırı 64; payımızı küçük tutuyoruz. */
const MAX_SCHEDULED = 30;

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.canAskAgain) {
    const next = await Notifications.requestPermissionsAsync();
    return next.granted;
  }
  return false;
}

/**
 * Temel hatırlatma (Faz 1): saati olan açık görevler için yerel bildirim
 * zamanlar. Görevler değiştikçe takvim baştan kurulur (az sayıda görev için
 * basit ve sağlam). Sunucu tabanlı kademeli bildirim Faz 2'de gelir.
 */
export function useTaskReminders(tasks: Task[] | null): void {
  const running = useRef(false);

  useEffect(() => {
    if (!tasks) return;
    if (running.current) return;
    running.current = true;

    const timed = tasks
      .filter(
        (task) =>
          (task.status === 'open' || task.status === 'in_progress') &&
          task.hasTime &&
          task.dueAtMs != null &&
          task.dueAtMs > Date.now() + 5_000,
      )
      .sort((a, b) => (a.dueAtMs ?? 0) - (b.dueAtMs ?? 0))
      .slice(0, MAX_SCHEDULED);

    (async () => {
      try {
        if (timed.length > 0 && !(await ensurePermission())) return;
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Promise.all(
          timed.map((task) =>
            Notifications.scheduleNotificationAsync({
              content: {
                title: t('notifications.taskDueTitle'),
                body: task.title,
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(task.dueAtMs as number),
              },
            }),
          ),
        );
      } catch (error) {
        console.warn('[notifications] zamanlama hatası', error);
      } finally {
        running.current = false;
      }
    })();
  }, [tasks]);
}
