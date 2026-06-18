import { dayKeyFromMs } from './time';
import type { Millis, ShoppingList } from './types';

/**
 * Alışveriş listeleri için "Bugün" gündemi (TODO mantığı). Aktif listeler şu
 * durumda bugünkü işlere girer:
 *  - Tarihliyse: gün anahtarı geçmiş → overdue, bugün → today (herkes için).
 *  - Tarihsizse: bana atanmış VEYA (atanmamış ve benim oluşturduğum) → today —
 *    yani sorumlusu olduğum liste, tarih vermesem de bugünkü işlerimde durur.
 * Tarihi gelecekte olan listeler gösterilmez (o güne planlı).
 */

export interface ShoppingDue {
  overdue: ShoppingList[];
  today: ShoppingList[];
}

function isMine(list: ShoppingList, uid: string): boolean {
  return list.assigneeId === uid || (list.assigneeId == null && list.createdBy === uid);
}

export function shoppingListsDue(
  lists: ShoppingList[],
  now: Millis,
  uid: string | null,
): ShoppingDue {
  const todayK = dayKeyFromMs(now);
  const overdue: ShoppingList[] = [];
  const today: ShoppingList[] = [];

  for (const list of lists) {
    if (list.status !== 'active') continue;
    if (list.dueAtMs != null) {
      const key = dayKeyFromMs(list.dueAtMs);
      if (key < todayK) overdue.push(list);
      else if (key === todayK) today.push(list);
      // gelecek tarih → gösterme
    } else if (uid && isMine(list, uid)) {
      today.push(list);
    }
  }

  overdue.sort((a, b) => (a.dueAtMs ?? 0) - (b.dueAtMs ?? 0));
  // Bugün: tarihli olanlar saate göre önce, tarihsizler (Infinity) sona; eşitse
  // yeni oluşturulan üste.
  today.sort((a, b) => {
    const ad = a.dueAtMs ?? Number.POSITIVE_INFINITY;
    const bd = b.dueAtMs ?? Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    return b.createdAtMs - a.createdAtMs;
  });
  return { overdue, today };
}
