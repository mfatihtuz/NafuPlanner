import type { Member, Reward } from '@/domain/types';
import { t } from '@/i18n';
import { addActivity } from '@/services/firestore/activity';
import {
  claimReward,
  clearRewardFulfillment,
  completeReward,
  fulfillReward,
} from '@/services/firestore/rewards';
import { notifyMembers } from '@/services/notifications/push';

/**
 * Ödül yaşam döngüsü iş akışları: al (tek seferlik) → uygula (herhangi bir üye)
 * → sahibi onaylar (tamamlanan). Firestore yazımı + push tek kapıdan yürür.
 */

interface Actor {
  uid: string;
  name: string;
}

export interface RewardFlowInput {
  reward: Reward;
  actor: Actor;
  members: Member[];
}

/** Ödülü alır (tek seferlik): puan düşer, sahibi işaretlenir, eşe haber gider. */
export async function claimRewardFlow(input: RewardFlowInput): Promise<void> {
  const { reward, actor } = input;
  await claimReward(reward.householdId, actor.uid, actor.name, reward);

  void addActivity({
    householdId: reward.householdId,
    type: 'reward_redeemed',
    actorId: actor.uid,
    actorName: actor.name,
    taskTitle: reward.title,
  });

  void notifyMembers({
    householdId: reward.householdId,
    excludeUid: actor.uid,
    title: t('push.rewardTitle'),
    body: t('push.rewardBody', {
      name: actor.name,
      reward: reward.title,
      cost: reward.costPoints ?? 0,
    }),
  });
}

/** Ödülü "uygulandı" işaretler; SAHİBİNE onay için push gider. */
export async function fulfillRewardFlow(input: RewardFlowInput): Promise<void> {
  const { reward, actor } = input;
  await fulfillReward(reward.householdId, reward.id, actor.uid, actor.name);
  if (reward.claimedBy && reward.claimedBy !== actor.uid) {
    void notifyMembers({
      householdId: reward.householdId,
      excludeUid: actor.uid,
      onlyUids: [reward.claimedBy],
      title: t('push.rewardFulfilledTitle'),
      body: t('push.rewardFulfilledBody', { name: actor.name, reward: reward.title }),
    });
  }
}

/** Sahibi onaylar → Tamamlanan'a geçer; uygulayana haber gider. */
export async function approveRewardFlow(input: RewardFlowInput): Promise<void> {
  const { reward, actor } = input;
  await completeReward(reward.householdId, reward.id);
  if (reward.fulfilledBy && reward.fulfilledBy !== actor.uid) {
    void notifyMembers({
      householdId: reward.householdId,
      excludeUid: actor.uid,
      onlyUids: [reward.fulfilledBy],
      title: t('push.rewardCompletedTitle'),
      body: t('push.rewardCompletedBody', { name: actor.name, reward: reward.title }),
    });
  }
}

/** Sahibi reddeder → uygulama işareti temizlenir; uygulayana haber gider. */
export async function rejectRewardFlow(input: RewardFlowInput): Promise<void> {
  const { reward, actor } = input;
  const fulfiller = reward.fulfilledBy;
  await clearRewardFulfillment(reward.householdId, reward.id);
  if (fulfiller && fulfiller !== actor.uid) {
    void notifyMembers({
      householdId: reward.householdId,
      excludeUid: actor.uid,
      onlyUids: [fulfiller],
      title: t('push.rewardRejectedTitle'),
      body: t('push.rewardRejectedBody', { name: actor.name, reward: reward.title }),
    });
  }
}
