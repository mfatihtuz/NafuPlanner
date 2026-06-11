import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { levelForPoints } from '@/domain/gamification';
import { SYSTEM_REWARD_AUTHOR, weeklySystemReward } from '@/domain/systemRewards';
import type { Reward } from '@/domain/types';
import { requireDb } from '@/services/firebase/config';

import { queryData } from './utils';

/** Yeni ödül tanımlar (örn. "Kazanan filmi seçer", 100 puan). */
export async function addReward(
  gid: string,
  title: string,
  costPoints: number,
  createdBy: string,
): Promise<void> {
  await addDoc(collection(requireDb(), 'groups', gid, 'rewards'), {
    title: title.trim(),
    costPoints,
    createdBy,
    createdAtMs: Date.now(),
    status: 'active',
  });
}

export async function removeReward(gid: string, rewardId: string): Promise<void> {
  await deleteDoc(doc(requireDb(), 'groups', gid, 'rewards', rewardId));
}

/**
 * Bu haftanın Nafu sistem ödülünü garanti eder. Kimlik haftaya sabit
 * (`system-<pazartesi>`) olduğundan idempotenttir: zaten varsa dokunmaz, iki
 * üye aynı anda açsa bile tek ödül oluşur. Uygulama açılışında çağrılır;
 * böylece Cloud Functions olmadan "her pazartesi yeni ödül" sağlanır.
 */
export async function ensureWeeklySystemReward(gid: string): Promise<void> {
  const weekly = weeklySystemReward(Date.now());
  const ref = doc(requireDb(), 'groups', gid, 'rewards', weekly.id);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    title: weekly.title,
    costPoints: weekly.costPoints,
    createdBy: SYSTEM_REWARD_AUTHOR,
    createdAtMs: Date.now(),
    status: 'active',
  });
}

/**
 * Ödülü kullanır: puanı düşer ve puan defterine işler. Ödül tekrar
 * kullanılabilir kalır (haneler "film seçme hakkı" gibi ödülleri yeniden
 * kullanır); kalıcı silme ayrı işlemdir.
 */
export async function redeemReward(
  gid: string,
  uid: string,
  reward: Reward,
  currentPoints: number,
): Promise<void> {
  const db = requireDb();
  const cost = reward.costPoints ?? 0;
  await updateDoc(doc(db, 'groups', gid, 'members', uid), {
    points: increment(-cost),
    level: levelForPoints(currentPoints - cost),
  });
  await addDoc(collection(db, 'groups', gid, 'points'), {
    userId: uid,
    delta: -cost,
    reason: 'reward_redeemed',
    rewardId: reward.id,
    createdAtMs: Date.now(),
  });
}

/** Hane ödüllerini canlı dinler (yeni → eski). */
export function watchRewards(gid: string, callback: (rewards: Reward[]) => void): () => void {
  const q = query(
    collection(requireDb(), 'groups', gid, 'rewards'),
    orderBy('createdAtMs', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => callback(queryData<Reward>(snap).map((r) => ({ ...r, householdId: gid }))),
    (error) => {
      console.warn('[firestore] ödül dinleme hatası', error);
      callback([]);
    },
  );
}
