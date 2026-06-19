import { PRIORITY_META } from './constants';
import { dayKeyFromMs } from './time';
import type { Millis, Task } from './types';

/**
 * Saf görev gruplama/sıralama kuralları (liste ekranları için).
 */

export interface TaskSections {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  noDate: Task[];
  done: Task[];
}

const isOpen = (task: Task) => task.status === 'open' || task.status === 'in_progress';

const byDueAsc = (a: Task, b: Task) => (a.dueAtMs ?? 0) - (b.dueAtMs ?? 0);
const byPriorityDesc = (a: Task, b: Task) =>
  PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight;
const byCreatedDesc = (a: Task, b: Task) => b.createdAtMs - a.createdAtMs;
const byCompletedDesc = (a: Task, b: Task) => (b.completedAtMs ?? 0) - (a.completedAtMs ?? 0);

/** Görevleri ekran bölümlerine ayırır ve her bölümü anlamlı sıralar. */
export function groupTasks(tasks: Task[], now: Millis): TaskSections {
  const todayKey = dayKeyFromMs(now);
  const sections: TaskSections = { overdue: [], today: [], upcoming: [], noDate: [], done: [] };

  for (const task of tasks) {
    if (task.status === 'archived') continue;
    if (task.status === 'done') {
      sections.done.push(task);
      continue;
    }
    if (!isOpen(task)) continue;
    if (task.dueAtMs == null) {
      sections.noDate.push(task);
      continue;
    }
    const dueKey = dayKeyFromMs(task.dueAtMs);
    if (dueKey < todayKey) sections.overdue.push(task);
    else if (dueKey === todayKey) sections.today.push(task);
    else sections.upcoming.push(task);
  }

  sections.overdue.sort(byDueAsc);
  // Bugün: saatli olanlar önce (saat sırasıyla), sonra öncelik.
  sections.today.sort((a, b) => {
    if (a.hasTime !== b.hasTime) return a.hasTime ? -1 : 1;
    if (a.hasTime && b.hasTime) return byDueAsc(a, b);
    return byPriorityDesc(a, b);
  });
  sections.upcoming.sort(byDueAsc);
  sections.noDate.sort((a, b) => byPriorityDesc(a, b) || byCreatedDesc(a, b));
  sections.done.sort(byCompletedDesc);

  return sections;
}

/** Alt görev ilerlemesi: [tamamlanan, toplam]. */
export function subtaskProgress(task: Task): [number, number] {
  const total = task.subtasks.length;
  const done = task.subtasks.filter((s) => s.done).length;
  return [done, total];
}

/**
 * Geri açma onay gerektirir mi? Başkasının tamamladığı görev geri açılınca
 * onun puanı geri alınır; bu yüzden (hanede başka üye varsa) onaya bağlıdır.
 * Kendi tamamladığın görevi onaysız geri açabilirsin.
 */
export function reopenNeedsApproval(task: Task, uid: string, memberCount: number): boolean {
  return (
    task.status === 'done' &&
    task.completedBy != null &&
    task.completedBy !== uid &&
    memberCount > 1
  );
}

/**
 * Bekleyen geri açma isteğini bu kullanıcı karara bağlayabilir mi?
 * (İsteyen kendi isteğini onaylayamaz.)
 */
export function canDecideReopen(task: Task, uid: string): boolean {
  return task.reopenRequestedBy != null && task.reopenRequestedBy !== uid;
}

/**
 * Tamamlama onay gerektirir mi? Görev belirli kişilere atanmışsa ve tamamlayan
 * bu atananlardan biri DEĞİLSE (ve hanede başka üye varsa) atananın onayı
 * gerekir. Atanmamış (paylaşılan) görevler serbestçe tamamlanır.
 */
export function completionNeedsApproval(task: Task, uid: string, memberCount: number): boolean {
  return (
    (task.status === 'open' || task.status === 'in_progress') &&
    task.assigneeIds.length > 0 &&
    !task.assigneeIds.includes(uid) &&
    memberCount > 1
  );
}

/**
 * Bekleyen tamamlama onayını bu kullanıcı karara bağlayabilir mi? (Görevin
 * atananı ve isteğin sahibi olmayan.)
 */
export function canDecideCompletion(task: Task, uid: string): boolean {
  return (
    task.pendingCompleteBy != null &&
    task.pendingCompleteBy !== uid &&
    task.assigneeIds.includes(uid)
  );
}
