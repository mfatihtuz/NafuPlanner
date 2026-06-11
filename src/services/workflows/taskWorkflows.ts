import {
  advanceStreak,
  levelForPoints,
  newlyEarnedBadges,
  type BadgeDef,
} from '@/domain/gamification';
import { dayKeyFromMs } from '@/domain/time';
import type { Member, RecurrenceRule, Reward, Task } from '@/domain/types';
import { t } from '@/i18n';
import { addActivity } from '@/services/firestore/activity';
import { addComment } from '@/services/firestore/comments';
import { applyCompletionRewards, revertCompletionRewards } from '@/services/firestore/members';
import { redeemReward } from '@/services/firestore/rewards';
import {
  createRecurrence,
  getRecurrence,
  spawnNextOccurrence,
  type NewRecurrenceInput,
} from '@/services/firestore/recurrences';
import { completeTask, createTask, reopenTask, type NewTaskInput } from '@/services/firestore/tasks';
import { omitUndefined } from '@/services/firestore/utils';
import { notifyMembers } from '@/services/notifications/push';

/**
 * Görev yaşam döngüsü iş akışları: Firestore yazımı + aktivite kaydı +
 * cihazlar-arası push + tekrar ilerletme tek kapıdan yürür. Yan etkiler
 * (aktivite/push) en iyi-çaba çalışır; ana yazım başarısızsa hata fırlar.
 */

interface Actor {
  uid: string;
  name: string;
}

export interface CreateTaskFlowInput {
  task: NewTaskInput;
  recurrence?: Omit<NewRecurrenceInput, 'template' | 'createdBy' | 'householdId'> | null;
  actor: Actor;
  members: Member[];
}

/** Görev oluşturur; tekrar kuralı verildiyse kural + ilk örnek üretilir. */
export async function createTaskFlow(input: CreateTaskFlowInput): Promise<void> {
  const { task, recurrence, actor, members } = input;

  if (recurrence) {
    const rule: NewRecurrenceInput = {
      ...recurrence,
      householdId: task.householdId,
      createdBy: actor.uid,
      // İç içe undefined (açıklamasız/kategorisiz görev) yazımı bozmasın.
      template: omitUndefined({
        title: task.title,
        description: task.description,
        categoryId: task.categoryId,
        priority: task.priority,
        assigneeIds: task.assigneeIds,
        points: task.points,
      }),
    };
    const ruleId = await createRecurrence(rule);
    // İlk örnek: başlangıç gününün bir önceki gününden ilerletilir.
    const fullRule: RecurrenceRule = {
      ...rule,
      id: ruleId,
      createdAtMs: Date.now(),
    };
    const dayBeforeStart = dayKeyFromMs(
      new Date(`${rule.startDayKey}T12:00:00`).getTime() - 86_400_000,
    );
    await spawnNextOccurrence(fullRule, dayBeforeStart);
  } else {
    await createTask(task);
  }

  void addActivity({
    householdId: task.householdId,
    type: 'task_created',
    actorId: actor.uid,
    actorName: actor.name,
    taskTitle: task.title,
  });

  // Başkasına atandıysa haber ver.
  const others = task.assigneeIds.filter((id) => id !== actor.uid);
  if (others.length > 0) {
    void notifyMembers({
      members,
      excludeUid: actor.uid,
      onlyUids: others,
      title: t('push.assignedTitle'),
      body: t('push.assignedBody', { name: actor.name, task: task.title }),
    });
  }
}

export interface CompleteTaskFlowInput {
  task: Task;
  actor: Actor;
  members: Member[];
}

/** Kutlama ekranı için tamamlanma sonucu. */
export interface CompletionReward {
  pointsAwarded: number;
  newLevel: number | null;
  newBadges: BadgeDef[];
  streakCount: number;
}

/**
 * Görevi tamamlar; puan/seri/rozet ödüllerini işler; tekrar kuralı varsa
 * sıradaki örneği üretir; eşe haber verir. Kutlama için ödül özetini döndürür.
 */
export async function completeTaskFlow(input: CompleteTaskFlowInput): Promise<CompletionReward> {
  const { task, actor, members } = input;
  await completeTask(task.householdId, task.id, actor.uid);

  // Ödüller: mevcut üyelik durumundan saf kurallarla hesapla, tek seferde yaz.
  const me = members.find((m) => m.userId === actor.uid);
  const beforePoints = me?.points ?? 0;
  const afterPoints = beforePoints + task.points;
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

  try {
    await applyCompletionRewards({
      householdId: task.householdId,
      userId: actor.uid,
      taskId: task.id,
      pointsDelta: task.points,
      level: levelAfter,
      streak,
      newBadgeKeys: newBadges.map((b) => b.key),
    });
  } catch (error) {
    console.warn('[workflow] ödüller işlenemedi', error);
  }

  void addActivity({
    householdId: task.householdId,
    type: 'task_completed',
    actorId: actor.uid,
    actorName: actor.name,
    taskId: task.id,
    taskTitle: task.title,
  });

  void notifyMembers({
    members,
    excludeUid: actor.uid,
    title: t('push.completedTitle'),
    body: t('push.completedBody', { name: actor.name, task: task.title }),
  });

  if (task.recurrenceId) {
    try {
      const rule = await getRecurrence(task.householdId, task.recurrenceId);
      if (rule) {
        const after = task.occurrenceDayKey ?? dayKeyFromMs(Date.now());
        await spawnNextOccurrence(rule, after);
      }
    } catch (error) {
      console.warn('[workflow] tekrar ilerletilemedi', error);
    }
  }

  return {
    pointsAwarded: task.points,
    newLevel: levelAfter > levelBefore ? levelAfter : null,
    newBadges,
    streakCount: streak.streakCount,
  };
}

/** Görevi geri açar ve puanı tamamlayandan geri alır (rozetler kalıcıdır). */
export async function reopenTaskFlow(task: Task): Promise<void> {
  const completedBy = task.completedBy;
  await reopenTask(task.householdId, task.id);
  if (completedBy) {
    try {
      await revertCompletionRewards({
        householdId: task.householdId,
        userId: completedBy,
        taskId: task.id,
        pointsDelta: task.points,
      });
    } catch (error) {
      console.warn('[workflow] puan geri alınamadı', error);
    }
  }
}

export interface NudgeFlowInput {
  task: Task;
  actor: Actor;
  members: Member[];
}

/** Atananları (yoksa diğer üyeleri) nazikçe dürter. */
export async function nudgeTaskFlow(input: NudgeFlowInput): Promise<void> {
  const { task, actor, members } = input;
  const targets =
    task.assigneeIds.filter((id) => id !== actor.uid).length > 0
      ? task.assigneeIds.filter((id) => id !== actor.uid)
      : members.map((m) => m.userId).filter((id) => id !== actor.uid);

  await notifyMembers({
    members,
    excludeUid: actor.uid,
    onlyUids: targets,
    title: t('push.nudgeTitle'),
    body: t('push.nudgeBody', { name: actor.name, task: task.title }),
    requireNudges: true,
  });

  const targetNames = members
    .filter((m) => targets.includes(m.userId))
    .map((m) => m.displayName.split(' ')[0]);

  void addActivity({
    householdId: task.householdId,
    type: 'task_nudged',
    actorId: actor.uid,
    actorName: actor.name,
    taskId: task.id,
    taskTitle: task.title,
    targetNames,
  });
}

export interface CommentFlowInput {
  task: Task;
  body: string;
  actor: Actor;
  members: Member[];
}

/** Göreve yorum ekler; aktiviteye işler ve diğer üyelere haber verir. */
export async function commentTaskFlow(input: CommentFlowInput): Promise<void> {
  const { task, body, actor, members } = input;
  await addComment(task.householdId, task.id, actor.uid, body);

  void addActivity({
    householdId: task.householdId,
    type: 'task_commented',
    actorId: actor.uid,
    actorName: actor.name,
    taskId: task.id,
    taskTitle: task.title,
  });

  void notifyMembers({
    members,
    excludeUid: actor.uid,
    title: t('push.commentTitle', { task: task.title }),
    body: t('push.commentBody', { name: actor.name, text: body.trim().slice(0, 80) }),
  });
}

export interface RedeemRewardFlowInput {
  reward: Reward;
  actor: Actor;
  members: Member[];
}

/** Ödülü kullanır: puan düşer, aktiviteye işlenir, eşe haber gider. */
export async function redeemRewardFlow(input: RedeemRewardFlowInput): Promise<void> {
  const { reward, actor, members } = input;
  const me = members.find((m) => m.userId === actor.uid);
  await redeemReward(reward.householdId, actor.uid, reward, me?.points ?? 0);

  void addActivity({
    householdId: reward.householdId,
    type: 'reward_redeemed',
    actorId: actor.uid,
    actorName: actor.name,
    taskTitle: reward.title,
  });

  void notifyMembers({
    members,
    excludeUid: actor.uid,
    title: t('push.rewardTitle'),
    body: t('push.rewardBody', {
      name: actor.name,
      reward: reward.title,
      cost: reward.costPoints ?? 0,
    }),
  });
}
