import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
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

export class RewardError extends Error {
  constructor(public reason: 'already-claimed' | 'insufficient' | 'missing') {
    super(reason);
    this.name = 'RewardError';
  }
}

/**
 * Ödülü ALIR (tek seferlik): bir transaction içinde ödül hâlâ 'active' mi ve
 * puan yeterli mi diye bakar; öyleyse puanı düşer ve ödülü 'claimed' + sahibi
 * bilgisiyle işaretler. Böylece aynı ödül iki kez alınıp puan boşa gitmez.
 * (Çevrimdışıyken transaction başarısız olur → çevrimiçi olunca tekrar denenir.)
 */
export async function claimReward(
  gid: string,
  uid: string,
  uidName: string,
  reward: Reward,
): Promise<void> {
  const db = requireDb();
  const rewardRef = doc(db, 'groups', gid, 'rewards', reward.id);
  const memberRef = doc(db, 'groups', gid, 'members', uid);
  await runTransaction(db, async (tx) => {
    const rSnap = await tx.get(rewardRef);
    if (!rSnap.exists()) throw new RewardError('missing');
    const r = rSnap.data() as Reward;
    if (r.status !== 'active') throw new RewardError('already-claimed');
    const cost = r.costPoints ?? 0;
    const mSnap = await tx.get(memberRef);
    const points = (mSnap.data()?.points as number | undefined) ?? 0;
    if (points < cost) throw new RewardError('insufficient');
    tx.update(memberRef, {
      points: increment(-cost),
      level: levelForPoints(points - cost),
    });
    tx.update(rewardRef, {
      status: 'claimed',
      claimedBy: uid,
      claimedByName: uidName,
      claimedAtMs: Date.now(),
    });
  });
  // Puan defterine işle (transaction dışı; en iyi çaba — rebuildPoints ile tutarlı).
  await addDoc(collection(db, 'groups', gid, 'points'), {
    userId: uid,
    delta: -(reward.costPoints ?? 0),
    reason: 'reward_redeemed',
    rewardId: reward.id,
    createdAtMs: Date.now(),
  });
}

/** Ödülü "uygulandı" işaretler (herhangi bir üye); sahibinin onayına gider. */
export async function fulfillReward(
  gid: string,
  rewardId: string,
  byUid: string,
  byName: string,
): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'rewards', rewardId), {
    fulfilledBy: byUid,
    fulfilledByName: byName,
    fulfilledAtMs: Date.now(),
  });
}

/** Sahibi onaylar → Tamamlanan'a geçer. */
export async function completeReward(gid: string, rewardId: string): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'rewards', rewardId), {
    status: 'completed',
    completedAtMs: Date.now(),
  });
}

/** Sahibi reddeder → uygulama işareti temizlenir (tekrar uygulanabilir). */
export async function clearRewardFulfillment(gid: string, rewardId: string): Promise<void> {
  await updateDoc(doc(requireDb(), 'groups', gid, 'rewards', rewardId), {
    fulfilledBy: deleteField(),
    fulfilledByName: deleteField(),
    fulfilledAtMs: deleteField(),
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
