import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';

import type { Attachment } from '@/domain/types';
import { requireDb } from '@/services/firebase/config';

import { queryData } from './utils';

/** Yüklenen fotoğrafın meta verisini görevin altına yazar + sayacı artırır. */
export async function addAttachment(
  gid: string,
  taskId: string,
  data: { storagePath: string; url: string; uploadedBy: string },
): Promise<void> {
  const db = requireDb();
  await addDoc(collection(db, 'groups', gid, 'tasks', taskId, 'attachments'), {
    taskId,
    householdId: gid,
    kind: 'image',
    storagePath: data.storagePath,
    url: data.url,
    uploadedBy: data.uploadedBy,
    createdAtMs: Date.now(),
  });
  await updateDoc(doc(db, 'groups', gid, 'tasks', taskId), {
    attachmentsCount: increment(1),
  });
}

/** Görev fotoğraflarını canlı dinler (eski → yeni). key = `${gid}/${taskId}`. */
export function watchAttachments(
  key: string,
  callback: (attachments: Attachment[]) => void,
): () => void {
  const [gid, taskId] = key.split('/');
  const q = query(
    collection(requireDb(), 'groups', gid, 'tasks', taskId, 'attachments'),
    orderBy('createdAtMs', 'asc'),
  );
  return onSnapshot(
    q,
    (snap) => callback(queryData<Attachment>(snap)),
    (error) => {
      console.warn('[firestore] ek dinleme hatası', error);
      callback([]);
    },
  );
}

/** Fotoğraf meta verisini siler + sayacı azaltır (Storage nesnesi ayrı silinir). */
export async function removeAttachment(
  gid: string,
  taskId: string,
  attachmentId: string,
): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, 'groups', gid, 'tasks', taskId, 'attachments', attachmentId));
  await updateDoc(doc(db, 'groups', gid, 'tasks', taskId), {
    attachmentsCount: increment(-1),
  });
}
