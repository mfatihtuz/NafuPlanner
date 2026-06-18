import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import type { ShoppingList } from '@/domain/types';
import { requireDb } from '@/services/firebase/config';

import { queryData } from './utils';

/** Yeni alışveriş listesi oluşturur. */
export async function createShoppingList(
  gid: string,
  name: string,
  createdBy: string,
  assigneeId?: string | null,
): Promise<string> {
  const ref = await addDoc(collection(requireDb(), 'groups', gid, 'shoppingLists'), {
    name: name.trim(),
    assigneeId: assigneeId ?? null,
    status: 'active',
    reminders: [],
    createdBy,
    createdAtMs: Date.now(),
  });
  return ref.id;
}

/**
 * Liste adı / atanan kişi / bağlı hatırlatmaları / tarihli hatırlatmayı günceller.
 * `dueAtMs: null` tarihli hatırlatmayı (ve saatini) temizler.
 */
export async function updateShoppingList(
  gid: string,
  lid: string,
  patch: {
    name?: string;
    assigneeId?: string | null;
    reminders?: string[];
    dueAtMs?: number | null;
    hasTime?: boolean;
  },
): Promise<void> {
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name.trim();
  if (patch.assigneeId !== undefined) data.assigneeId = patch.assigneeId;
  if (patch.reminders !== undefined) data.reminders = patch.reminders;
  if (patch.dueAtMs !== undefined) {
    if (patch.dueAtMs === null) {
      data.dueAtMs = deleteField();
      data.hasTime = deleteField();
    } else {
      data.dueAtMs = patch.dueAtMs;
      data.hasTime = patch.hasTime ?? false;
    }
  }
  await updateDoc(doc(requireDb(), 'groups', gid, 'shoppingLists', lid), data);
}

/** Listeyi ve içindeki tüm ürünleri tek seferde siler. */
export async function deleteShoppingList(gid: string, lid: string): Promise<void> {
  const db = requireDb();
  const itemsSnap = await getDocs(
    query(collection(db, 'groups', gid, 'shopping'), where('listId', '==', lid)),
  );
  const batch = writeBatch(db);
  itemsSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'groups', gid, 'shoppingLists', lid));
  await batch.commit();
}

/** Listeyi tamamlandı olarak işaretler (kazanılan puanı saklar). */
export async function markShoppingListCompleted(
  gid: string,
  lid: string,
  byUid: string,
  awardedPoints: number,
): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'shoppingLists', lid), {
    status: 'done',
    completedBy: byUid,
    completedAtMs: Date.now(),
    awardedPoints,
  });
}

/** Listeyi yeniden aktif yapar (tamamlanma alanlarını temizler). */
export async function markShoppingListReopened(gid: string, lid: string): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'shoppingLists', lid), {
    status: 'active',
    completedBy: deleteField(),
    completedAtMs: deleteField(),
    awardedPoints: deleteField(),
  });
}

/** Hane alışveriş listelerini canlı dinler (yeni → eski). */
export function watchShoppingLists(
  gid: string,
  callback: (lists: ShoppingList[]) => void,
): () => void {
  const q = query(
    collection(requireDb(), 'groups', gid, 'shoppingLists'),
    orderBy('createdAtMs', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => callback(queryData<ShoppingList>(snap).map((l) => ({ ...l, householdId: gid }))),
    (error) => {
      console.warn('[firestore] alışveriş listesi dinleme hatası', error);
      callback([]);
    },
  );
}
