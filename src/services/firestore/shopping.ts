import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';

import type { ShoppingItem } from '@/domain/types';
import { requireDb } from '@/services/firebase/config';

import { queryData } from './utils';

export async function addShoppingItem(
  gid: string,
  name: string,
  addedBy: string,
  listId?: string,
): Promise<void> {
  // listId undefined ise Firestore (ignoreUndefinedProperties) alanı atlar →
  // ürün "Genel" kovasına düşer.
  await addDoc(collection(requireDb(), 'groups', gid, 'shopping'), {
    name: name.trim(),
    listId,
    checked: false,
    addedBy,
    addedAtMs: Date.now(),
  });
}

export async function setShoppingItemChecked(
  gid: string,
  itemId: string,
  checked: boolean,
  byUid: string,
): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'shopping', itemId), {
    checked,
    checkedBy: checked ? byUid : deleteField(),
    checkedAtMs: checked ? Date.now() : deleteField(),
  });
}

export async function removeShoppingItem(gid: string, itemId: string): Promise<void> {
  await deleteDoc(doc(requireDb(), 'groups', gid, 'shopping', itemId));
}

/** Bir ürünün reyonunu (manuel kategori) ayarlar. */
export async function setShoppingItemAisle(
  gid: string,
  itemId: string,
  aisle: string,
): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'shopping', itemId), { aisle });
}

/** Alışveriş listesini canlı dinler (yeni → eski). */
export function watchShopping(
  gid: string,
  callback: (items: ShoppingItem[]) => void,
): () => void {
  const q = query(
    collection(requireDb(), 'groups', gid, 'shopping'),
    orderBy('addedAtMs', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => callback(queryData<ShoppingItem>(snap).map((i) => ({ ...i, householdId: gid }))),
    (error) => {
      console.warn('[firestore] alışveriş dinleme hatası', error);
      callback([]);
    },
  );
}
