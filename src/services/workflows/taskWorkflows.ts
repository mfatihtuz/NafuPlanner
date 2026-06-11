import { dayKeyFromMs } from '@/domain/time';
import type { Member, RecurrenceRule, Task } from '@/domain/types';
import { t } from '@/i18n';
import { addActivity } from '@/services/firestore/activity';
import {
  createRecurrence,
  getRecurrence,
  spawnNextOccurrence,
  type NewRecurrenceInput,
} from '@/services/firestore/recurrences';
import { completeTask, createTask, reopenTask, type NewTaskInput } from '@/services/firestore/tasks';
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
      template: {
        title: task.title,
        description: task.description,
        categoryId: task.categoryId,
        priority: task.priority,
        assigneeIds: task.assigneeIds,
        points: task.points,
      },
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

/** Görevi tamamlar; tekrar kuralı varsa sıradaki örneği üretir; eşe haber verir. */
export async function completeTaskFlow(input: CompleteTaskFlowInput): Promise<void> {
  const { task, actor, members } = input;
  await completeTask(task.householdId, task.id, actor.uid);

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
}

export async function reopenTaskFlow(task: Task): Promise<void> {
  await reopenTask(task.householdId, task.id);
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
