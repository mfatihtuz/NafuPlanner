import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';

import type { TaskComment } from '@/domain/types';
import { requireDb } from '@/services/firebase/config';

import { queryData } from './utils';

/** Yorum ekler ve görevin yorum sayacını artırır. */
export async function addComment(
  gid: string,
  taskId: string,
  authorId: string,
  body: string,
): Promise<void> {
  const db = requireDb();
  await addDoc(collection(db, 'groups', gid, 'tasks', taskId, 'comments'), {
    authorId,
    body: body.trim(),
    createdAtMs: Date.now(),
  });
  await updateDoc(doc(db, 'groups', gid, 'tasks', taskId), {
    commentsCount: increment(1),
  });
}

/**
 * Görev yorumlarını canlı dinler (eski → yeni).
 * Anahtar biçimi: `${gid}/${taskId}` (useWatch tek anahtar bekler).
 */
export function watchComments(
  key: string,
  callback: (comments: TaskComment[]) => void,
): () => void {
  const [gid, taskId] = key.split('/');
  const q = query(
    collection(requireDb(), 'groups', gid, 'tasks', taskId, 'comments'),
    orderBy('createdAtMs', 'asc'),
  );
  return onSnapshot(
    q,
    (snap) =>
      callback(
        queryData<TaskComment>(snap).map((c) => ({ ...c, taskId, householdId: gid })),
      ),
    (error) => {
      console.warn('[firestore] yorum dinleme hatası', error);
      callback([]);
    },
  );
}
