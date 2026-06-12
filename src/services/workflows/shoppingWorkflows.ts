import {
  advanceStreak,
  levelForPoints,
  newlyEarnedBadges,
  shoppingListPoints,
} from '@/domain/gamification';
import { dayKeyFromMs } from '@/domain/time';
import type { Member, ShoppingList } from '@/domain/types';
import { t } from '@/i18n';
import { addActivity } from '@/services/firestore/activity';
import { applyCompletionRewards, revertCompletionRewards } from '@/services/firestore/members';
import {
  markShoppingListCompleted,
  markShoppingListReopened,
} from '@/services/firestore/shoppingLists';
import { notifyMembers } from '@/services/notifications/push';

import type { CompletionReward } from './taskWorkflows';

interface Actor {
  uid: string;
  name: string;
}

export interface CompleteShoppingListFlowInput {
  list: ShoppingList;
  itemCount: number;
  actor: Actor;
  members: Member[];
}

/**
 * Alışveriş listesini tamamlar: puanı atanan kişiye (yoksa tamamlayana) yazar,
 * seri/rozet/seviye ödüllerini işler, aktivite + push üretir. Kutlama için ödül
 * özetini döndürür (görev tamamlamayla aynı CompletionReward biçimi).
 */
export async function completeShoppingListFlow(
  input: CompleteShoppingListFlowInput,
): Promise<CompletionReward> {
  const { list, itemCount, actor, members } = input;
  const gid = list.householdId;
  const recipientId = list.assigneeId ?? actor.uid;
  const points = shoppingListPoints(itemCount);

  await markShoppingListCompleted(gid, list.id, recipientId, points);

  const me = members.find((m) => m.userId === recipientId);
  const beforePoints = me?.points ?? 0;
  const afterPoints = beforePoints + points;
  const streak = advanceStreak(
    { streakCount: me?.streakCount ?? 0, lastActiveDayKey: me?.lastActiveDayKey },
    dayKeyFromMs(Date.now()),
  );
  const newBadges = newlyEarnedBadges(
    {
      tasksCompleted: (me?.tasksCompleted ?? 0) + 1,
      points: afterPoints,
      streakCount: streak.streakCount,
    },
    me?.earnedBadgeKeys ?? [],
  );
  const levelBefore = levelForPoints(beforePoints);
  const levelAfter = levelForPoints(afterPoints);

  if (points > 0) {
    try {
      await applyCompletionRewards({
        householdId: gid,
        userId: recipientId,
        taskId: `shop:${list.id}`,
        pointsDelta: points,
        level: levelAfter,
        streak,
        newBadgeKeys: newBadges.map((b) => b.key),
      });
    } catch (error) {
      console.warn('[workflow] alışveriş ödülü işlenemedi', error);
    }
  }

  void addActivity({
    householdId: gid,
    type: 'shopping_completed',
    actorId: recipientId,
    actorName: me?.displayName ?? actor.name,
    taskTitle: list.name,
  });

  void notifyMembers({
    members,
    excludeUid: actor.uid,
    title: t('push.shoppingDoneTitle'),
    body: t('push.shoppingDoneBody', { name: actor.name, list: list.name }),
  });

  return {
    pointsAwarded: points,
    newLevel: levelAfter > levelBefore ? levelAfter : null,
    newBadges,
    streakCount: streak.streakCount,
  };
}

/** Listeyi geri açar ve yazılan puanı atanan kişiden geri alır. */
export async function reopenShoppingListFlow(list: ShoppingList): Promise<void> {
  const gid = list.householdId;
  await markShoppingListReopened(gid, list.id);
  if (list.completedBy && list.awardedPoints) {
    try {
      await revertCompletionRewards({
        householdId: gid,
        userId: list.completedBy,
        taskId: `shop:${list.id}`,
        pointsDelta: list.awardedPoints,
      });
    } catch (error) {
      console.warn('[workflow] alışveriş puanı geri alınamadı', error);
    }
  }
}
