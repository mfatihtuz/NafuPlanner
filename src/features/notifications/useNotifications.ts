import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ActivityEntry } from '@/domain/types';
import { watchActivity } from '@/services/firestore/activity';
import { useWatch } from '@/services/firestore/useWatch';

const SEEN_PREFIX = 'nafu:notifSeen:';

function seenKey(uid: string): string {
  return `${SEEN_PREFIX}${uid}`;
}

/** Bildirimlerin en son görüldüğü zaman (ms). Yoksa 0. */
export async function getNotifSeen(uid: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(seenKey(uid));
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export async function setNotifSeen(uid: string, ms: number): Promise<void> {
  try {
    await AsyncStorage.setItem(seenKey(uid), String(ms));
  } catch {
    // sessizce yoksay
  }
}

/**
 * Bir aktivite kaydı "bana ait bildirim" mi? Atama + dürtme yalnız hedefi
 * bensem; yorum başkası yaptıysa (küçük hane akışı için hepsi). Kendi
 * eylemlerim bildirim değildir.
 */
export function isNotificationFor(entry: ActivityEntry, uid: string): boolean {
  if (entry.actorId === uid) return false;
  switch (entry.type) {
    case 'task_assigned':
    case 'task_nudged':
      return (entry.targetIds ?? []).includes(uid);
    case 'task_commented':
      return true;
    default:
      return false;
  }
}

/** Hane aktivitesinden bana ait bildirimleri süzer (yeni → eski). */
export function useNotifications(
  householdId: string | null,
  uid: string | null,
): ActivityEntry[] | null {
  const activity = useWatch(householdId, watchActivity);
  if (activity == null) return null;
  if (!uid) return [];
  return activity.filter((entry) => isNotificationFor(entry, uid));
}
