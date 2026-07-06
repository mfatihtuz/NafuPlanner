import { computeCompletionReward, shoppingListPoints } from '@/domain/gamification';
import { dayKeyFromMs } from '@/domain/time';
import type { Member, ShoppingList } from '@/domain/types';
import { t } from '@/i18n';
import { addActivity } from '@/services/firestore/activity';
import { applyCompletionRewards, revertCompletionRewards } from '@/services/firestore/members';
import { moveShoppingItemsToList } from '@/services/firestore/shopping';
import {
  createShoppingList,
  markShoppingListCompleted,
  markShoppingListReopened,
  updateShoppingList,
} from '@/services/firestore/shoppingLists';
import { notifyMembers } from '@/services/notifications/push';

import type { CompletionReward } from './taskWorkflows';

interface Actor {
  uid: string;
  name: string;
}

// Aynı liste için eşzamanlı tamamlama/geri açmayı engeller (çift puan / negatif
// puan koruması).
const completingLists = new Set<string>();
const reopeningLists = new Set<string>();

export interface CreateShoppingListFlowInput {
  gid: string;
  name: string;
  actor: Actor;
  members: Member[];
}

/**
 * Alışveriş listesi oluşturur; haneye aktivite düşer ve diğer üyelere "yeni
 * liste" bildirimi gider (böylece eş, listeye ürün ekleyebileceğini bilir).
 * Oluşturulan listenin id'sini döndürür.
 */
export async function createShoppingListFlow(
  input: CreateShoppingListFlowInput,
): Promise<string> {
  const { gid, name, actor } = input;
  const trimmed = name.trim();
  const lid = await createShoppingList(gid, trimmed, actor.uid);

  void addActivity({
    householdId: gid,
    type: 'shopping_created',
    actorId: actor.uid,
    actorName: actor.name,
    taskTitle: trimmed,
  });

  void notifyMembers({
    householdId: gid,
    excludeUid: actor.uid,
    title: t('push.shoppingCreatedTitle'),
    body: t('push.shoppingCreatedBody', { name: actor.name, list: trimmed }),
  });

  return lid;
}

export interface AssignShoppingListFlowInput {
  list: ShoppingList;
  /** Yeni atanan kişi; null = atamayı kaldır. */
  assigneeId: string | null;
  actor: Actor;
  members: Member[];
}

/**
 * Alışveriş listesini bir üyeye atar (veya atamayı kaldırır). Başkasına
 * atandıysa o kişiye push + bildirim merkezi aktivitesi gider. Kendine atama
 * ya da kaldırma sessizdir.
 */
export async function assignShoppingListFlow(
  input: AssignShoppingListFlowInput,
): Promise<void> {
  const { list, assigneeId, actor, members } = input;
  const gid = list.householdId;
  await updateShoppingList(gid, list.id, { assigneeId });

  if (assigneeId == null || assigneeId === actor.uid) return;

  const target = members.find((m) => m.userId === assigneeId);
  void addActivity({
    householdId: gid,
    type: 'shopping_assigned',
    actorId: actor.uid,
    actorName: actor.name,
    // Bildirim merkezinden listeye gidebilmek için liste kimliğini taşı.
    taskId: list.id,
    taskTitle: list.name,
    targetIds: [assigneeId],
    targetNames: target ? [target.displayName.split(' ')[0]] : [],
  });

  void notifyMembers({
    householdId: gid,
    excludeUid: actor.uid,
    onlyUids: [assigneeId],
    title: t('push.shoppingAssignedTitle'),
    body: t('push.shoppingAssignedBody', { name: actor.name, list: list.name }),
  });
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
): Promise<CompletionReward | null> {
  const { list, itemCount, actor, members } = input;
  const gid = list.householdId;
  if (completingLists.has(list.id)) return null; // çift dokunuş → yok say
  completingLists.add(list.id);
  try {
    const recipientId = list.assigneeId ?? actor.uid;
    const points = shoppingListPoints(itemCount);

    await markShoppingListCompleted(gid, list.id, recipientId, points);

    // Ortak ödül hesabı; alışveriş GÖREV rozetini saymaz (adalet).
    const reward = computeCompletionReward({
      member: members.find((m) => m.userId === recipientId),
      pointsDelta: points,
      todayKey: dayKeyFromMs(Date.now()),
      countsTowardTaskBadges: false,
    });

    if (points > 0) {
      try {
        await applyCompletionRewards({
          householdId: gid,
          userId: recipientId,
          taskId: `shop:${list.id}`,
          pointsDelta: points,
          level: reward.levelAfter,
          streak: reward.streak,
          newBadgeKeys: reward.newBadges.map((b) => b.key),
          counterField: 'shoppingCompleted',
        });
      } catch (error) {
        console.warn('[workflow] alışveriş ödülü işlenemedi', error);
      }
    }

    // Aktivitede eylemi YAPAN görünür (puan atanana gitse bile); push metniyle
    // tutarlı kalır.
    void addActivity({
      householdId: gid,
      type: 'shopping_completed',
      actorId: actor.uid,
      actorName: actor.name,
      taskTitle: list.name,
    });

    void notifyMembers({
      householdId: gid,
      excludeUid: actor.uid,
      title: t('push.shoppingDoneTitle'),
      body: t('push.shoppingDoneBody', { name: actor.name, list: list.name }),
    });

    return {
      pointsAwarded: points,
      newLevel: reward.levelAfter > reward.levelBefore ? reward.levelAfter : null,
      newBadges: reward.newBadges,
      streakCount: reward.streak.streakCount,
    };
  } finally {
    completingLists.delete(list.id);
  }
}

export interface SplitShoppingListFlowInput {
  gid: string;
  sourceList: ShoppingList;
  newListName: string;
  /** Yeni listeye taşınacak (alınmamış) ürün kimlikleri. */
  remainingItemIds: string[];
  /** Kaynak listede kalan (alınan) ürün sayısı — puan buna göre. */
  completedCount: number;
  actor: Actor;
  members: Member[];
}

/**
 * "Pazardan eksik döndüm" akışı: kalan (alınmamış) ürünler için YENİ bir liste
 * açar, o ürünleri oraya taşır ve kaynak listeyi (alınan ürün sayısına göre
 * puanla) tamamlar. Kutlama için ödül özetini döndürür.
 */
export async function splitShoppingListFlow(
  input: SplitShoppingListFlowInput,
): Promise<CompletionReward | null> {
  const { gid, sourceList, newListName, remainingItemIds, completedCount, actor, members } = input;
  // 1) Kalanlar için yeni liste (üyelere bildirim + aktivite).
  const newListId = await createShoppingListFlow({ gid, name: newListName, actor, members });
  // 2) Alınmamış ürünleri yeni listeye taşı.
  await moveShoppingItemsToList(gid, remainingItemIds, newListId);
  // 3) Kaynak listeyi alınanlarla tamamla.
  return completeShoppingListFlow({ list: sourceList, itemCount: completedCount, actor, members });
}

/** Listeyi geri açar ve yazılan puanı atanan kişiden geri alır. */
export async function reopenShoppingListFlow(list: ShoppingList): Promise<void> {
  const gid = list.householdId;
  if (reopeningLists.has(list.id)) return; // çift dokunuş → çift geri alma olmasın
  reopeningLists.add(list.id);
  try {
    await markShoppingListReopened(gid, list.id);
    if (list.completedBy && list.awardedPoints) {
      try {
        await revertCompletionRewards({
          householdId: gid,
          userId: list.completedBy,
          taskId: `shop:${list.id}`,
          pointsDelta: list.awardedPoints,
          counterField: 'shoppingCompleted',
        });
      } catch (error) {
        console.warn('[workflow] alışveriş puanı geri alınamadı', error);
      }
    }
  } finally {
    reopeningLists.delete(list.id);
  }
}
