import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

import { nextOccurrenceDayKey, occurrenceDueAt } from '@/domain/recurrence';
import type { DayKey, RecurrenceRule, Task } from '@/domain/types';
import { requireDb } from '@/services/firebase/config';

import { docData, omitUndefined } from './utils';

export type NewRecurrenceInput = Omit<RecurrenceRule, 'id' | 'createdAtMs' | 'lastSpawnedDayKey'>;

/** Yeni tekrar kuralı oluşturur ve id'sini döndürür. */
export async function createRecurrence(input: NewRecurrenceInput): Promise<string> {
  const db = requireDb();
  const ref = doc(collection(db, 'groups', input.householdId, 'recurrences'));
  const { householdId, ...data } = input;
  await setDoc(
    ref,
    omitUndefined({ ...data, createdAtMs: Date.now() } as Record<string, unknown>),
  );
  return ref.id;
}

export async function getRecurrence(
  gid: string,
  ruleId: string,
): Promise<RecurrenceRule | null> {
  const snap = await getDoc(doc(requireDb(), 'groups', gid, 'recurrences', ruleId));
  const rule = docData<RecurrenceRule>(snap);
  return rule ? { ...rule, householdId: gid } : null;
}

/**
 * Kuralın `after` sonrasındaki örneğini görev olarak üretir. Görev kimliği
 * deterministiktir (`{ruleId}_{dayKey}`): iki cihaz aynı anda ilerletse bile
 * tek belge oluşur (idempotent). Kural bittiyse null döner.
 */
export async function spawnNextOccurrence(
  rule: RecurrenceRule,
  after: DayKey,
): Promise<DayKey | null> {
  if (!rule.active) return null;
  const nextDay = nextOccurrenceDayKey(rule, after);
  if (!nextDay) return null;

  const db = requireDb();
  const { dueAtMs, hasTime } = occurrenceDueAt(nextDay, rule.time);
  const task: Omit<Task, 'id'> = {
    householdId: rule.householdId,
    ...rule.template,
    status: 'open',
    dueAtMs,
    hasTime,
    subtasks: [],
    recurrenceId: rule.id,
    occurrenceDayKey: nextDay,
    attachmentsCount: 0,
    commentsCount: 0,
    createdBy: rule.createdBy,
    createdAtMs: Date.now(),
  };
  const { householdId, ...taskData } = task;

  await setDoc(
    doc(db, 'groups', rule.householdId, 'tasks', `${rule.id}_${nextDay}`),
    omitUndefined(taskData as Record<string, unknown>),
  );
  await updateDoc(doc(db, 'groups', rule.householdId, 'recurrences', rule.id), {
    lastSpawnedDayKey: nextDay,
  });
  return nextDay;
}

/** Hane tekrar kurallarını canlı dinler. */
export function watchRecurrences(
  gid: string,
  callback: (rules: RecurrenceRule[]) => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), 'groups', gid, 'recurrences'),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, householdId: gid, ...d.data() }) as RecurrenceRule));
    },
    (error) => {
      console.warn('[firestore] tekrar dinleme hatası', error);
      callback([]);
    },
  );
}
