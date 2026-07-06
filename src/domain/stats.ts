import { WEEKDAY_LABELS_TR } from './constants';
import { dayKeyFromMs } from './time';
import type { DayKey, Millis, Task } from './types';

/**
 * İstatistik ekranı için saf hesaplar.
 */

export interface DailyCount {
  dayKey: DayKey;
  /** Kısa gün adı (Pzt, Sal…). */
  label: string;
  count: number;
}

/** Son N günde, gün başına tamamlanan görev sayısı (eski → bugün). */
export function dailyDoneCounts(tasks: Task[], now: Millis, days = 7): DailyCount[] {
  const DAY = 86_400_000;
  const buckets: DailyCount[] = [];
  const indexByKey = new Map<string, number>();

  for (let i = days - 1; i >= 0; i--) {
    const ms = now - i * DAY;
    const dayKey = dayKeyFromMs(ms);
    indexByKey.set(dayKey, buckets.length);
    buckets.push({
      dayKey,
      label: WEEKDAY_LABELS_TR[new Date(ms).getDay()],
      count: 0,
    });
  }

  for (const task of tasks) {
    if (task.status !== 'done' || task.completedAtMs == null) continue;
    const index = indexByKey.get(dayKeyFromMs(task.completedAtMs));
    if (index != null) buckets[index].count += 1;
  }
  return buckets;
}

/** Verilen andan beri kategori başına tamamlanan görev sayısı (null = kategorisiz). */
export function categoryDoneCounts(
  tasks: Task[],
  sinceMs: Millis,
): Map<string | null, number> {
  const totals = new Map<string | null, number>();
  for (const task of tasks) {
    if (task.status !== 'done' || task.completedAtMs == null) continue;
    if (task.completedAtMs < sinceMs) continue;
    const key = task.categoryId ?? null;
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  return totals;
}
