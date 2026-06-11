import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import {
  buildDigestBody,
  buildTaskReminderTimes,
  nextDailyDigestMs,
} from '@/domain/reminders';
import { dayKeyFromMs } from '@/domain/time';
import type { Task, UserSettings } from '@/domain/types';
import { t } from '@/i18n';

/** iOS bekleyen bildirim sınırı 64; payımızı küçük tutuyoruz. */
const MAX_SCHEDULED = 28;

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.canAskAgain) {
    return (await Notifications.requestPermissionsAsync()).granted;
  }
  return false;
}

function isMine(task: Task, myUid: string): boolean {
  return task.assigneeIds.length === 0 || task.assigneeIds.includes(myUid);
}

const isOpen = (task: Task) => task.status === 'open' || task.status === 'in_progress';

/**
 * Yerel bildirim takvimini kurar (Faz 2):
 * - Bana ait (veya atanmamış) saatli görevler: son tarihte hatırlat + 30 dk
 *   sonra "hâlâ bekliyor" kademesi; sessiz saatler sabaha kaydırılır.
 * - Günlük özet: ayarlardaki saatte bugünün açık görev özeti.
 * Görevler/ayarlar değiştikçe takvim baştan kurulur (küçük veri için sağlam).
 */
export function useNotificationScheduler(
  tasks: Task[] | null,
  settings: UserSettings | null | undefined,
  myUid: string | null,
): void {
  const running = useRef(false);

  useEffect(() => {
    if (!tasks || !myUid) return;
    if (running.current) return;
    running.current = true;

    (async () => {
      try {
        const now = Date.now();

        // Görev hatırlatmaları (zaman + içerik)
        const reminders: { atMs: number; title: string; body: string }[] = [];
        for (const task of tasks) {
          if (!isOpen(task) || !isMine(task, myUid)) continue;
          const times = buildTaskReminderTimes(task, settings, now);
          times.forEach((atMs, index) => {
            reminders.push({
              atMs,
              title:
                index === 0 ? t('notifications.taskDueTitle') : t('notifications.taskStillWaiting'),
              body: task.title,
            });
          });
        }
        reminders.sort((a, b) => a.atMs - b.atMs);
        const capped = reminders.slice(0, MAX_SCHEDULED);

        // Günlük özet
        const digestAt = nextDailyDigestMs(settings, now);
        let digestBody: string | null = null;
        if (digestAt != null) {
          const digestDay = dayKeyFromMs(digestAt);
          const openToday = tasks.filter(
            (task) =>
              isOpen(task) &&
              isMine(task, myUid) &&
              task.dueAtMs != null &&
              dayKeyFromMs(task.dueAtMs) <= digestDay,
          );
          digestBody = buildDigestBody(openToday.map((task) => task.title));
        }

        if (capped.length === 0 && digestAt == null) {
          await Notifications.cancelAllScheduledNotificationsAsync();
          return;
        }
        if (!(await ensurePermission())) return;

        await Notifications.cancelAllScheduledNotificationsAsync();
        const schedule = capped.map((reminder) =>
          Notifications.scheduleNotificationAsync({
            content: { title: reminder.title, body: reminder.body, sound: true },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(reminder.atMs),
            },
          }),
        );
        if (digestAt != null && digestBody != null) {
          schedule.push(
            Notifications.scheduleNotificationAsync({
              content: {
                title: t('notifications.digestTitle'),
                body: digestBody,
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(digestAt),
              },
            }),
          );
        }
        await Promise.all(schedule);
      } catch (error) {
        console.warn('[notifications] zamanlama hatası', error);
      } finally {
        running.current = false;
      }
    })();
  }, [tasks, settings, myUid]);
}
