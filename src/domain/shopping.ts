import { dayKeyFromMs } from './time';
import type { Millis, ShoppingList } from './types';

/**
 * Tarihli alışveriş listeleri için saf gruplama. Aktif (tamamlanmamış) ve
 * tarihi olan listeler, "Bugün" görünümünde ve widget'ta görevlerle birlikte
 * gösterilir.
 */

const isActive = (list: ShoppingList) => list.status === 'active';

export interface ShoppingDue {
  overdue: ShoppingList[];
  today: ShoppingList[];
}

/** Aktif + tarihli listeleri gecikmiş / bugün olarak ayırır (tarihe göre artan). */
export function shoppingListsDue(lists: ShoppingList[], now: Millis): ShoppingDue {
  const todayK = dayKeyFromMs(now);
  const overdue: ShoppingList[] = [];
  const today: ShoppingList[] = [];

  for (const list of lists) {
    if (!isActive(list) || list.dueAtMs == null) continue;
    const key = dayKeyFromMs(list.dueAtMs);
    if (key < todayK) overdue.push(list);
    else if (key === todayK) today.push(list);
  }

  const byDue = (a: ShoppingList, b: ShoppingList) => (a.dueAtMs ?? 0) - (b.dueAtMs ?? 0);
  overdue.sort(byDue);
  today.sort(byDue);
  return { overdue, today };
}
