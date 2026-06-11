import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';

import type { ActivityEntry } from '@/domain/types';
import { requireDb } from '@/services/firebase/config';

import { omitUndefined, queryData } from './utils';

export type NewActivityInput = Omit<ActivityEntry, 'id' | 'atMs'>;

/** Aktivite kaydı düşer (akış bilgilendirme amaçlı; hatalar yutulur). */
export async function addActivity(input: NewActivityInput): Promise<void> {
  try {
    const { householdId, ...data } = input;
    await addDoc(
      collection(requireDb(), 'groups', householdId, 'activity'),
      omitUndefined({ ...data, atMs: Date.now() } as Record<string, unknown>),
    );
  } catch (error) {
    console.warn('[activity] kayıt yazılamadı', error);
  }
}

/** Son aktiviteleri canlı dinler (yeni → eski). */
export function watchActivity(
  gid: string,
  callback: (entries: ActivityEntry[]) => void,
): () => void {
  const q = query(
    collection(requireDb(), 'groups', gid, 'activity'),
    orderBy('atMs', 'desc'),
    limit(20),
  );
  return onSnapshot(
    q,
    (snap) => callback(queryData<ActivityEntry>(snap).map((e) => ({ ...e, householdId: gid }))),
    (error) => {
      console.warn('[firestore] aktivite dinleme hatası', error);
      callback([]);
    },
  );
}
