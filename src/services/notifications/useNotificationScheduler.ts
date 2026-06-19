import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import {
  buildDigestBody,
  buildTaskReminderTimes,
  nextDailyDigestMs,
  shoppingReminderAt,
} from '@/domain/reminders';
import { dayKeyFromMs } from '@/domain/time';
import type { ShoppingList, Task, UserSettings } from '@/domain/types';
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
  /** Seri hatırlatması için: aktif seri sayısı + en son aktif gün. */
  streak?: { count: number; lastActiveDayKey?: string },
  /** Tarihli alışveriş listeleri (bana ait/atanmamış olanlara hatırlatma kurulur). */
  shoppingLists?: ShoppingList[] | null,
): void {
  // Eşzamanlı kurulum (cancelAll + schedule) çakışmasın diye çalıştırmaları
  // zincire dizer; önceki "meşgulken geleni at" yaklaşımı son değişikliği
  // kaybediyordu (görev güncellense de takvim eski kalabiliyordu).
  const chain = useRef<Promise<void>>(Promise.resolve());
  // Son kurulan takvimin imzası; aynıysa cancelAll + yeniden kurma atlanır
  // (alakasız re-render'larda 28+ bildirimi boşuna sil-yeniden kurma).
  const lastSig = useRef<string | null>(null);

  useEffect(() => {
    if (!myUid) return;

    chain.current = chain.current.then(async () => {
      try {
        const now = Date.now();
        // tasks henüz yüklenmemiş olsa (null) bile haftalık ödül bildirimi
        // kurulabilsin diye boş listeyle devam ederiz.
        const list = tasks ?? [];

        // Görev hatırlatmaları (zaman + içerik)
        const reminders: { atMs: number; title: string; body: string }[] = [];
        for (const task of list) {
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
        // Tarihli alışveriş listeleri: bana ait/atanmamış olanlara tek bildirim.
        for (const list of shoppingLists ?? []) {
          if (list.assigneeId != null && list.assigneeId !== myUid) continue;
          const atMs = shoppingReminderAt(list, settings, now);
          if (atMs == null) continue;
          reminders.push({ atMs, title: t('push.shoppingReminderTitle'), body: list.name });
        }

        reminders.sort((a, b) => a.atMs - b.atMs);
        const capped = reminders.slice(0, MAX_SCHEDULED);

        // Günlük özet
        const digestAt = nextDailyDigestMs(settings, now);
        let digestBody: string | null = null;
        if (digestAt != null) {
          const digestDay = dayKeyFromMs(digestAt);
          const openToday = list.filter(
            (task) =>
              isOpen(task) &&
              isMine(task, myUid) &&
              task.dueAtMs != null &&
              dayKeyFromMs(task.dueAtMs) <= digestDay,
          );
          digestBody = buildDigestBody(openToday.map((task) => task.title));
        }

        // Kendi bildirimi (görev/özet) olmayan kullanıcıyı SIRF haftalık ödül
        // için erkenden izin istemeye zorlamayız (yeni kullanıcıya görev yokken
        // izin penceresi açılması istenmez). İzin zaten verilmişse haftalık
        // ödül yine de kurulur.
        const hasUserNotifications =
          capped.length > 0 || (digestAt != null && digestBody != null);
        const perm = await Notifications.getPermissionsAsync();
        if (!perm.granted && !hasUserNotifications) {
          await Notifications.cancelAllScheduledNotificationsAsync();
          return;
        }
        if (!(await ensurePermission())) return;

        // Kurulacak takvimin imzası değişmediyse hiç dokunma (sil-yeniden kurma
        // maliyeti + iOS bildirim bütçesi). Haftalık ödül sabit olduğundan
        // imzaya katılmaz; ilk kurulumda zaten eklenir.
        const signature = JSON.stringify({
          reminders: capped.map((r) => `${r.atMs}|${r.title}`),
          digestAt,
          digestBody,
          streak: streak ? `${streak.count}|${streak.lastActiveDayKey ?? ''}` : '',
        });
        if (signature === lastSig.current) return;
        lastSig.current = signature;

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

        // Her pazartesi 10:00 — Nafu'nun haftalık ödülü, özel sesle.
        schedule.push(
          Notifications.scheduleNotificationAsync({
            content: {
              title: t('weeklyReward.notifTitle'),
              body: t('weeklyReward.notifBody'),
              sound: 'nafu-reward.wav',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: 2, // expo: 1=Pazar … 2=Pazartesi
              hour: 10,
              minute: 0,
              channelId: 'weekly-reward', // Android: özel ses bu kanaldan çalar
            },
          }),
        );

        // Seri hatırlatması: aktif serisi olup bugün henüz görev tamamlamamış
        // kullanıcıya, bugün 20:00'da (henüz geçmediyse) nazik bir dürtme.
        if (streak && streak.count > 0 && streak.lastActiveDayKey !== dayKeyFromMs(now)) {
          const at = new Date(now);
          at.setHours(20, 0, 0, 0);
          if (at.getTime() > now) {
            schedule.push(
              Notifications.scheduleNotificationAsync({
                content: {
                  title: t('notifications.streakTitle'),
                  body: t('notifications.streakBody', { n: streak.count }),
                  sound: true,
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: at,
                },
              }),
            );
          }
        }

        await Promise.all(schedule);
      } catch (error) {
        console.warn('[notifications] zamanlama hatası', error);
      }
    });
    // streak objesi her render yeniden oluşabilir; obje referansı yerine
    // bilinçli olarak alanlarını bağımlılık veriyoruz (gereksiz yeniden
    // zamanlamayı önler).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, shoppingLists, settings, myUid, streak?.count, streak?.lastActiveDayKey]);
}
