import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  increment,
  updateDoc,
} from 'firebase/firestore';

import { levelForPoints } from '@/domain/gamification';
import type { StreakState } from '@/domain/gamification';
import { requireDb } from '@/services/firebase/config';

/**
 * Üyelik belgesindeki oyunlaştırma alanlarını günceller ve puan defterine
 * (points alt koleksiyonu) kayıt düşer. Sayaçlar increment() ile yazılır —
 * eşzamanlı tamamlamalarda çakışma güvenlidir.
 */

export interface CompletionRewardWrite {
  householdId: string;
  userId: string;
  taskId: string;
  pointsDelta: number;
  level: number;
  streak: StreakState;
  newBadgeKeys: string[];
  /** Artırılacak sayaç (görev rozetleri yalnız tasksCompleted'i sayar). */
  counterField?: 'tasksCompleted' | 'shoppingCompleted';
}

export async function applyCompletionRewards(input: CompletionRewardWrite): Promise<void> {
  const db = requireDb();
  const memberRef = doc(db, 'groups', input.householdId, 'members', input.userId);

  const update: Record<string, unknown> = {
    points: increment(input.pointsDelta),
    [input.counterField ?? 'tasksCompleted']: increment(1),
    level: input.level,
    streakCount: input.streak.streakCount,
  };
  if (input.streak.lastActiveDayKey) update.lastActiveDayKey = input.streak.lastActiveDayKey;
  if (input.newBadgeKeys.length > 0) update.earnedBadgeKeys = arrayUnion(...input.newBadgeKeys);
  await updateDoc(memberRef, update);

  await addDoc(collection(db, 'groups', input.householdId, 'points'), {
    userId: input.userId,
    delta: input.pointsDelta,
    reason: 'task_completed',
    taskId: input.taskId,
    createdAtMs: Date.now(),
  });
}

export interface RevertRewardWrite {
  householdId: string;
  userId: string;
  taskId: string;
  pointsDelta: number;
  /** Azaltılacak sayaç (apply ile aynı olmalı). */
  counterField?: 'tasksCompleted' | 'shoppingCompleted';
}

/** Geri açmada puan ve sayaç geri alınır; seri ve rozetler kalıcıdır. */
export async function revertCompletionRewards(input: RevertRewardWrite): Promise<void> {
  const db = requireDb();
  const memberRef = doc(db, 'groups', input.householdId, 'members', input.userId);
  await updateDoc(memberRef, {
    points: increment(-input.pointsDelta),
    [input.counterField ?? 'tasksCompleted']: increment(-1),
  });
  await addDoc(collection(db, 'groups', input.householdId, 'points'), {
    userId: input.userId,
    delta: -input.pointsDelta,
    reason: 'task_reopened',
    taskId: input.taskId,
    createdAtMs: Date.now(),
  });
}

/** Puan değişiminden sonra seviye alanını tutarlı tutmak isteyen çağrılar için. */
export async function syncMemberLevel(
  householdId: string,
  userId: string,
  points: number,
): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', householdId, 'members', userId), {
    level: levelForPoints(points),
  });
}
