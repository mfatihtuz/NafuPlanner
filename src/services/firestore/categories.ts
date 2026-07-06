import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';

import type { Category } from '@/domain/types';
import { requireDb } from '@/services/firebase/config';

import { queryData } from './utils';

/** Haneye yeni (kullanıcı tanımlı) kategori ekler. */
export async function addCategory(
  gid: string,
  name: string,
  color: string,
  icon = 'tag',
): Promise<string> {
  const ref = await addDoc(collection(requireDb(), 'groups', gid, 'categories'), {
    name: name.trim(),
    color,
    icon,
    isDefault: false,
    order: Date.now(), // varsayılanların (küçük order) arkasına düşer
  });
  return ref.id;
}

/** Kategori ad/renk/ikon günceller. */
export async function updateCategory(
  gid: string,
  cid: string,
  patch: { name?: string; color?: string; icon?: string },
): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'categories', cid), patch);
}

/** Kategoriyi siler. (Varsayılanlar UI'da silinemez tutulur.) */
export async function removeCategory(gid: string, cid: string): Promise<void> {
  await deleteDoc(doc(requireDb(), 'groups', gid, 'categories', cid));
}

/** Hane kategorilerini canlı dinler (order'a göre). */
export function watchCategories(
  gid: string,
  callback: (categories: Category[]) => void,
): () => void {
  const q = query(collection(requireDb(), 'groups', gid, 'categories'), orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snap) => callback(queryData<Category>(snap).map((c) => ({ ...c, householdId: gid }))),
    (error) => {
      console.warn('[firestore] kategori dinleme hatası', error);
      callback([]);
    },
  );
}
