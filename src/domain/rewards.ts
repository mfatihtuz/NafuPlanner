import type { Id, Reward } from './types';

/**
 * Ödül yaşam döngüsü (saf yardımcılar):
 *  active   → vitrinde, alınmayı bekliyor
 *  claimed  → biri aldı (tek sahiplik); uygulanıp sahibinin onayına gidecek
 *  completed→ sahibi onayladı
 */

export interface RewardGroups {
  /** Vitrin: alınmayı bekleyen. */
  available: Reward[];
  /** Alınan ama henüz tamamlanmamış. */
  claimed: Reward[];
  /** Sahibi onaylamış. */
  completed: Reward[];
}

export function groupRewards(rewards: Reward[]): RewardGroups {
  const available: Reward[] = [];
  const claimed: Reward[] = [];
  const completed: Reward[] = [];
  for (const reward of rewards) {
    if (reward.status === 'completed') completed.push(reward);
    else if (reward.status === 'active') available.push(reward);
    else claimed.push(reward); // 'claimed' (+ eski veriler)
  }
  return { available, claimed, completed };
}

/** Ödül "uygulandı" işaretlenmiş ve onay bekliyor mu? */
export function isRewardPendingApproval(reward: Reward): boolean {
  return reward.status === 'claimed' && reward.fulfilledBy != null;
}

/** Bekleyen onayı bu kullanıcı (ödülün sahibi) karara bağlayabilir mi? */
export function canApproveReward(reward: Reward, uid: Id): boolean {
  return isRewardPendingApproval(reward) && reward.claimedBy === uid;
}
