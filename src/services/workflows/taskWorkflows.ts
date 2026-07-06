import { computeCompletionReward, type BadgeDef } from '@/domain/gamification';
import { dayKeyFromMs, dueAtFromDayKey } from '@/domain/time';
import type { ClockTime, DayKey, Member, RecurrenceRule, Task } from '@/domain/types';
import { t } from '@/i18n';
import { addActivity } from '@/services/firestore/activity';
import { addComment } from '@/services/firestore/comments';
import { applyCompletionRewards, revertCompletionRewards } from '@/services/firestore/members';
import {
  createRecurrence,
  getRecurrence,
  spawnNextOccurrence,
  type NewRecurrenceInput,
} from '@/services/firestore/recurrences';
import {
  clearCompletionRequest,
  clearReopenRequest,
  completeTask,
  createTask,
  reopenTask,
  setCompletionRequest,
  setReopenRequest,
  updateTask,
  type NewTaskInput,
} from '@/services/firestore/tasks';
import { omitUndefined } from '@/services/firestore/utils';
import { NOTIF_CATEGORY } from '@/services/notifications/categories';
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

// Aynı görev için eşzamanlı tamamlama/geri açma çağrılarını engeller (hızlı çift
// dokunuş veya yeniden giriş → çift puan / negatif puan olmasın). Modül düzeyinde
// tutulur; akış bitince temizlenir.
const completing = new Set<string>();
const reopening = new Set<string>();

export interface CreateTaskFlowInput {
  task: NewTaskInput;
  recurrence?: Omit<NewRecurrenceInput, 'template' | 'createdBy' | 'householdId'> | null;
  actor: Actor;
  members: Member[];
}

/** Görev oluşturur; tekrar kuralı verildiyse kural + ilk örnek üretilir. */
export async function createTaskFlow(input: CreateTaskFlowInput): Promise<void> {
  const { task, recurrence, actor, members } = input;

  let createdTaskId: string | undefined;
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
    createdTaskId = await createTask(task);
  }

  void addActivity({
    householdId: task.householdId,
    type: 'task_created',
    actorId: actor.uid,
    actorName: actor.name,
    taskId: createdTaskId,
    taskTitle: task.title,
  });

  // Başkasına atandıysa bildirim + aktivite (bildirim merkezi bunu süzer).
  const others = task.assigneeIds.filter((id) => id !== actor.uid);
  if (others.length > 0) {
    const targetNames = members
      .filter((m) => others.includes(m.userId))
      .map((m) => m.displayName.split(' ')[0]);
    void addActivity({
      householdId: task.householdId,
      type: 'task_assigned',
      actorId: actor.uid,
      actorName: actor.name,
      taskId: createdTaskId,
      taskTitle: task.title,
      targetIds: others,
      targetNames,
    });
    void notifyMembers({
      householdId: task.householdId,
      excludeUid: actor.uid,
      onlyUids: others,
      title: t('push.assignedTitle'),
      body: t('push.assignedBody', { name: actor.name, task: task.title }),
      ...(createdTaskId
        ? {
            categoryId: NOTIF_CATEGORY.task,
            data: { gid: task.householdId, taskId: createdTaskId },
          }
        : {}),
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
export async function completeTaskFlow(
  input: CompleteTaskFlowInput,
): Promise<CompletionReward | null> {
  const { task, actor, members } = input;
  if (completing.has(task.id)) return null; // çift dokunuş / yeniden giriş → yok say
  completing.add(task.id);
  try {
    await completeTask(task.householdId, task.id, actor.uid);

    // Ödül hesabı görev + alışverişte ortak (saf); görev rozetlerini sayar.
    const reward = computeCompletionReward({
      member: members.find((m) => m.userId === actor.uid),
      pointsDelta: task.points,
      todayKey: dayKeyFromMs(Date.now()),
      countsTowardTaskBadges: true,
    });

    try {
      await applyCompletionRewards({
        householdId: task.householdId,
        userId: actor.uid,
        taskId: task.id,
        pointsDelta: task.points,
        level: reward.levelAfter,
        streak: reward.streak,
        newBadgeKeys: reward.newBadges.map((b) => b.key),
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
      householdId: task.householdId,
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
      newLevel: reward.levelAfter > reward.levelBefore ? reward.levelAfter : null,
      newBadges: reward.newBadges,
      streakCount: reward.streak.streakCount,
    };
  } finally {
    completing.delete(task.id);
  }
}

/** Görevi geri açar ve puanı tamamlayandan geri alır (rozetler kalıcıdır). */
export async function reopenTaskFlow(task: Task): Promise<void> {
  if (reopening.has(task.id)) return; // çift dokunuş → çift geri alma olmasın
  reopening.add(task.id);
  try {
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
  } finally {
    reopening.delete(task.id);
  }
}

export interface ReopenRequestFlowInput {
  task: Task;
  actor: Actor;
  members: Member[];
}

/**
 * Başkasının tamamladığı görev için geri açma onayı ister: istek görevin
 * üzerine işlenir, diğer üyelere aktivite + push gider. Bir üye onaylayınca
 * görev geri açılır (puan tamamlayandan döner); reddederse istek silinir.
 */
export async function requestReopenTaskFlow(input: ReopenRequestFlowInput): Promise<void> {
  const { task, actor, members } = input;
  await setReopenRequest(task.householdId, task.id, actor.uid, actor.name);

  const targets = members.map((m) => m.userId).filter((id) => id !== actor.uid);
  const targetNames = members
    .filter((m) => targets.includes(m.userId))
    .map((m) => m.displayName.split(' ')[0]);

  void addActivity({
    householdId: task.householdId,
    type: 'task_reopen_requested',
    actorId: actor.uid,
    actorName: actor.name,
    taskId: task.id,
    taskTitle: task.title,
    targetIds: targets,
    targetNames,
  });

  void notifyMembers({
    householdId: task.householdId,
    excludeUid: actor.uid,
    title: t('push.reopenRequestTitle'),
    body: t('push.reopenRequestBody', { name: actor.name, task: task.title }),
  });
}

/** İsteği onaylar: görevi geri açar (puan döner) ve isteyene haber verir. */
export async function approveReopenTaskFlow(input: ReopenRequestFlowInput): Promise<void> {
  const { task, actor } = input;
  const requesterId = task.reopenRequestedBy;
  await reopenTaskFlow(task);
  if (requesterId) {
    void notifyMembers({
      householdId: task.householdId,
      excludeUid: actor.uid,
      onlyUids: [requesterId],
      title: t('push.reopenApprovedTitle'),
      body: t('push.reopenApprovedBody', { name: actor.name, task: task.title }),
    });
  }
}

/** İsteği reddeder: istek silinir, görev tamamlanmış kalır; isteyene haber gider. */
export async function rejectReopenTaskFlow(input: ReopenRequestFlowInput): Promise<void> {
  const { task, actor } = input;
  const requesterId = task.reopenRequestedBy;
  await clearReopenRequest(task.householdId, task.id);
  if (requesterId) {
    void notifyMembers({
      householdId: task.householdId,
      excludeUid: actor.uid,
      onlyUids: [requesterId],
      title: t('push.reopenRejectedTitle'),
      body: t('push.reopenRejectedBody', { name: actor.name, task: task.title }),
    });
  }
}

/** İsteyen kendi geri açma isteğinden vazgeçer. */
export async function cancelReopenTaskFlow(task: Task): Promise<void> {
  await clearReopenRequest(task.householdId, task.id);
}

export interface CompleteApprovalFlowInput {
  task: Task;
  actor: Actor;
  members: Member[];
}

/**
 * Atanmamış kişi, başkasına atanmış görevi "tamamladım" işaretleyince: istek
 * görevin üzerine işlenir, ATANAN(lar)a aktivite + push gider. Atanan onaylarsa
 * görev tamamlanır (puan isteği yapana yazılır); reddederse istek silinir.
 */
export async function requestCompleteTaskFlow(input: CompleteApprovalFlowInput): Promise<void> {
  const { task, actor, members } = input;
  await setCompletionRequest(task.householdId, task.id, actor.uid, actor.name);

  const targets = task.assigneeIds;
  const targetNames = members
    .filter((m) => targets.includes(m.userId))
    .map((m) => m.displayName.split(' ')[0]);

  void addActivity({
    householdId: task.householdId,
    type: 'task_complete_requested',
    actorId: actor.uid,
    actorName: actor.name,
    taskId: task.id,
    taskTitle: task.title,
    targetIds: targets,
    targetNames,
  });

  void notifyMembers({
    householdId: task.householdId,
    excludeUid: actor.uid,
    onlyUids: targets,
    title: t('push.completeRequestTitle'),
    body: t('push.completeRequestBody', { name: actor.name, task: task.title }),
    categoryId: NOTIF_CATEGORY.approval,
    data: { gid: task.householdId, taskId: task.id },
  });
}

/**
 * Atanan, bekleyen tamamlamayı onaylar: görev İSTEĞİ YAPAN adına tamamlanır
 * (puan ona yazılır, completeTask bekleyen alanları temizler) ve isteyene haber
 * verilir.
 */
export async function approveCompleteTaskFlow(input: CompleteApprovalFlowInput): Promise<void> {
  const { task, actor, members } = input;
  const requesterId = task.pendingCompleteBy;
  if (!requesterId) return;
  await completeTaskFlow({
    task,
    actor: { uid: requesterId, name: task.pendingCompleteByName ?? '' },
    members,
  });
  void notifyMembers({
    householdId: task.householdId,
    excludeUid: actor.uid,
    onlyUids: [requesterId],
    title: t('push.completeApprovedTitle'),
    body: t('push.completeApprovedBody', { name: actor.name, task: task.title }),
  });
}

/** Atanan, bekleyen tamamlamayı reddeder: istek silinir, görev açık kalır. */
export async function rejectCompleteTaskFlow(input: CompleteApprovalFlowInput): Promise<void> {
  const { task, actor } = input;
  const requesterId = task.pendingCompleteBy;
  await clearCompletionRequest(task.householdId, task.id);
  if (requesterId) {
    void notifyMembers({
      householdId: task.householdId,
      excludeUid: actor.uid,
      onlyUids: [requesterId],
      title: t('push.completeRejectedTitle'),
      body: t('push.completeRejectedBody', { name: actor.name, task: task.title }),
    });
  }
}

/** İsteyen kendi tamamlama isteğinden vazgeçer. */
export async function cancelCompleteTaskFlow(task: Task): Promise<void> {
  await clearCompletionRequest(task.householdId, task.id);
}

/**
 * Görevi verilen güne erteler. Saatli görevde günün saati korunur; saatsizde
 * öğlene alınır. (Kartlardan hızlı erteleme için.)
 */
export async function snoozeTaskFlow(task: Task, dayKey: DayKey): Promise<void> {
  let time: ClockTime | null = null;
  if (task.hasTime && task.dueAtMs != null) {
    const d = new Date(task.dueAtMs);
    time = { hour: d.getHours(), minute: d.getMinutes() };
  }
  const { dueAtMs, hasTime } = dueAtFromDayKey(dayKey, time);
  await updateTask(task.householdId, task.id, { dueAtMs, hasTime });
}

export interface ReassignFlowInput {
  task: Task;
  toUserId: string;
  actor: Actor;
  members: Member[];
}

/**
 * Görevi tek bir kişiye devreder ("eşe ver"). Devralan sen değilsen ona atama
 * aktivitesi + push gider (yeni atama akışıyla aynı bildirim).
 */
export async function reassignTaskFlow(input: ReassignFlowInput): Promise<void> {
  const { task, toUserId, actor, members } = input;
  await updateTask(task.householdId, task.id, { assigneeIds: [toUserId] });
  if (toUserId === actor.uid) return;
  const targetName = members.find((m) => m.userId === toUserId)?.displayName.split(' ')[0] ?? '';
  void addActivity({
    householdId: task.householdId,
    type: 'task_assigned',
    actorId: actor.uid,
    actorName: actor.name,
    taskId: task.id,
    taskTitle: task.title,
    targetIds: [toUserId],
    targetNames: [targetName],
  });
  void notifyMembers({
    householdId: task.householdId,
    excludeUid: actor.uid,
    onlyUids: [toUserId],
    title: t('push.assignedTitle'),
    body: t('push.assignedBody', { name: actor.name, task: task.title }),
    categoryId: NOTIF_CATEGORY.task,
    data: { gid: task.householdId, taskId: task.id },
  });
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
    householdId: task.householdId,
    excludeUid: actor.uid,
    onlyUids: targets,
    title: t('push.nudgeTitle'),
    body: t('push.nudgeBody', { name: actor.name, task: task.title }),
    requireNudges: true,
    categoryId: NOTIF_CATEGORY.task,
    data: { gid: task.householdId, taskId: task.id },
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
    targetIds: targets,
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
  const { task, body, actor } = input;
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
    householdId: task.householdId,
    excludeUid: actor.uid,
    title: t('push.commentTitle', { task: task.title }),
    body: t('push.commentBody', { name: actor.name, text: body.trim().slice(0, 80) }),
  });
}

