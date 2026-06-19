import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import type { Subtask, Task } from '@/domain/types';
import { requireDb } from '@/services/firebase/config';

import { omitUndefined, queryData } from './utils';

export type NewTaskInput = Omit<
  Task,
  'id' | 'createdAtMs' | 'attachmentsCount' | 'commentsCount' | 'completedBy' | 'completedAtMs'
>;

export async function createTask(input: NewTaskInput): Promise<string> {
  const db = requireDb();
  const data = omitUndefined({
    ...input,
    attachmentsCount: 0,
    commentsCount: 0,
    createdAtMs: Date.now(),
  } as Record<string, unknown>);
  const ref = await addDoc(collection(db, 'groups', input.householdId, 'tasks'), data);
  return ref.id;
}

export type TaskPatch = Partial<
  Pick<
    Task,
    | 'title'
    | 'description'
    | 'categoryId'
    | 'priority'
    | 'difficulty'
    | 'dueAtMs'
    | 'hasTime'
    | 'assigneeIds'
    | 'subtasks'
    | 'points'
    | 'orderIndex'
  >
> & {
  /** true gönderilirse alan Firestore'dan silinir. */
  clearDueDate?: boolean;
  clearCategory?: boolean;
  clearDescription?: boolean;
};

export async function updateTask(gid: string, taskId: string, patch: TaskPatch): Promise<void> {
  const { clearDueDate, clearCategory, clearDescription, ...fields } = patch;
  const data: Record<string, unknown> = omitUndefined(fields as Record<string, unknown>);
  if (clearDueDate) {
    data.dueAtMs = deleteField();
    data.hasTime = false;
  }
  if (clearCategory) data.categoryId = deleteField();
  if (clearDescription) data.description = deleteField();
  await updateDoc(doc(requireDb(), 'groups', gid, 'tasks', taskId), data);
}

export async function completeTask(gid: string, taskId: string, byUid: string): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'tasks', taskId), {
    status: 'done',
    completedBy: byUid,
    completedAtMs: Date.now(),
    // Tamamlanınca bekleyen tamamlama onayı (varsa) kapanır.
    pendingCompleteBy: deleteField(),
    pendingCompleteByName: deleteField(),
    pendingCompleteAtMs: deleteField(),
  });
}

/** Tamamlama onay isteğini görevin üzerine işler. */
export async function setCompletionRequest(
  gid: string,
  taskId: string,
  byUid: string,
  byName: string,
): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'tasks', taskId), {
    pendingCompleteBy: byUid,
    pendingCompleteByName: byName,
    pendingCompleteAtMs: Date.now(),
  });
}

/** Bekleyen tamamlama isteğini temizler (ret / vazgeçme). */
export async function clearCompletionRequest(gid: string, taskId: string): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'tasks', taskId), {
    pendingCompleteBy: deleteField(),
    pendingCompleteByName: deleteField(),
    pendingCompleteAtMs: deleteField(),
  });
}

export async function reopenTask(gid: string, taskId: string): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'tasks', taskId), {
    status: 'open',
    completedBy: deleteField(),
    completedAtMs: deleteField(),
    // Geri açma gerçekleşince bekleyen onay isteği de kapanır.
    reopenRequestedBy: deleteField(),
    reopenRequestedByName: deleteField(),
    reopenRequestedAtMs: deleteField(),
  });
}

/** Geri açma onay isteğini görevin üzerine işler. */
export async function setReopenRequest(
  gid: string,
  taskId: string,
  byUid: string,
  byName: string,
): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'tasks', taskId), {
    reopenRequestedBy: byUid,
    reopenRequestedByName: byName,
    reopenRequestedAtMs: Date.now(),
  });
}

/** Bekleyen geri açma isteğini temizler (ret / vazgeçme). */
export async function clearReopenRequest(gid: string, taskId: string): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'tasks', taskId), {
    reopenRequestedBy: deleteField(),
    reopenRequestedByName: deleteField(),
    reopenRequestedAtMs: deleteField(),
  });
}

export async function deleteTask(gid: string, taskId: string): Promise<void> {
  await deleteDoc(doc(requireDb(), 'groups', gid, 'tasks', taskId));
}

/** Tek bir görevi getirir (bildirim aksiyonu işleyicisi için). */
export async function getTask(gid: string, taskId: string): Promise<Task | null> {
  const snap = await getDoc(doc(requireDb(), 'groups', gid, 'tasks', taskId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Task, 'id'>), householdId: gid };
}

/** Birden çok görevin elle sıralama indeksini tek partide günceller. */
export async function setTaskOrder(
  gid: string,
  updates: { id: string; orderIndex: number }[],
): Promise<void> {
  if (updates.length === 0) return;
  const db = requireDb();
  const batch = writeBatch(db);
  for (const u of updates) {
    batch.update(doc(db, 'groups', gid, 'tasks', u.id), { orderIndex: u.orderIndex });
  }
  await batch.commit();
}

export async function setSubtasks(gid: string, taskId: string, subtasks: Subtask[]): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'tasks', taskId), { subtasks });
}

/** Hane görevlerini canlı dinler (yeni → eski). */
export function watchTasks(gid: string, callback: (tasks: Task[]) => void): () => void {
  const q = query(collection(requireDb(), 'groups', gid, 'tasks'), orderBy('createdAtMs', 'desc'));
  return onSnapshot(
    q,
    (snap) => callback(queryData<Task>(snap).map((task) => ({ ...task, householdId: gid }))),
    (error) => {
      console.warn('[firestore] görev dinleme hatası', error);
      callback([]);
    },
  );
}
