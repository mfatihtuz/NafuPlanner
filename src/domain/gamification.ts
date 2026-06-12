import { DIFFICULTY_META, POINTS_PER_LEVEL, PRIORITY_POINT_MULTIPLIER } from './constants';
import { isConsecutiveDay } from './time';
import type { Badge, DayKey, Difficulty, Millis, Priority, Task } from './types';

/**
 * Saf oyunlaştırma kuralları — yan etkisiz, kolayca test edilebilir.
 */

/** Bir görevi tamamlayınca kazanılan puan: efor tabanı × öncelik çarpanı. */
export function pointsForTask(priority: Priority, difficulty: Difficulty = 'medium'): number {
  return Math.round(DIFFICULTY_META[difficulty].base * PRIORITY_POINT_MULTIPLIER[priority]);
}

/** Toplam puandan seviye (1 tabanlı). */
export function levelForPoints(points: number): number {
  if (points <= 0) return 1;
  return Math.floor(points / POINTS_PER_LEVEL) + 1;
}

/** İçinde bulunulan seviyedeki ilerleme (0..1). */
export function levelProgress(points: number): number {
  const into = ((points % POINTS_PER_LEVEL) + POINTS_PER_LEVEL) % POINTS_PER_LEVEL;
  return into / POINTS_PER_LEVEL;
}

/** Bir sonraki seviyeye kalan puan. */
export function pointsToNextLevel(points: number): number {
  const current = levelForPoints(points);
  return current * POINTS_PER_LEVEL - points;
}

// --- Seri (streak) -------------------------------------------------------------

export interface StreakState {
  streakCount: number;
  lastActiveDayKey?: DayKey;
}

/**
 * Görev tamamlama gününe göre seriyi ilerletir: aynı gün → değişmez,
 * ardışık gün → +1, araya boşluk girdiyse → 1'den başlar.
 */
export function advanceStreak(state: StreakState, todayKey: DayKey): StreakState {
  if (state.lastActiveDayKey === todayKey) return state;
  if (state.lastActiveDayKey && isConsecutiveDay(state.lastActiveDayKey, todayKey)) {
    return { streakCount: state.streakCount + 1, lastActiveDayKey: todayKey };
  }
  return { streakCount: 1, lastActiveDayKey: todayKey };
}

// --- Rozetler -------------------------------------------------------------------

export interface BadgeStats {
  tasksCompleted: number;
  points: number;
  streakCount: number;
}

export interface BadgeDef extends Badge {
  /** Hangi istatistik eşiği bu rozeti kazandırır. */
  metric: keyof BadgeStats;
  threshold: number;
}

/** Rozet kataloğu (eşik tabanlı; kazanılan rozet kalıcıdır). */
export const BADGES: readonly BadgeDef[] = [
  {
    key: 'first_task',
    name: 'İlk Adım',
    description: 'İlk görevini tamamla',
    icon: 'star',
    metric: 'tasksCompleted',
    threshold: 1,
  },
  {
    key: 'tasks_25',
    name: 'Çalışkan Arı',
    description: '25 görev tamamla',
    icon: 'check',
    metric: 'tasksCompleted',
    threshold: 25,
  },
  {
    key: 'tasks_100',
    name: 'Görev Canavarı',
    description: '100 görev tamamla',
    icon: 'trophy',
    metric: 'tasksCompleted',
    threshold: 100,
  },
  {
    key: 'streak_3',
    name: 'Isınıyor',
    description: '3 günlük seri yakala',
    icon: 'flame',
    metric: 'streakCount',
    threshold: 3,
  },
  {
    key: 'streak_7',
    name: 'Haftalık Seri',
    description: '7 günlük seri yakala',
    icon: 'flame',
    metric: 'streakCount',
    threshold: 7,
  },
  {
    key: 'streak_30',
    name: 'Demir İrade',
    description: '30 günlük seri yakala',
    icon: 'flame',
    metric: 'streakCount',
    threshold: 30,
  },
  {
    key: 'points_500',
    name: 'Puan Avcısı',
    description: '500 puana ulaş',
    icon: 'sparkles',
    metric: 'points',
    threshold: 500,
  },
  {
    key: 'points_2000',
    name: 'Efsane',
    description: '2000 puana ulaş',
    icon: 'trophy',
    metric: 'points',
    threshold: 2000,
  },
] as const;

/** Yeni kazanılan rozetler: hak edilenler − halihazırda sahip olunanlar. */
export function newlyEarnedBadges(stats: BadgeStats, owned: string[]): BadgeDef[] {
  const ownedSet = new Set(owned);
  return BADGES.filter((b) => stats[b.metric] >= b.threshold && !ownedSet.has(b.key));
}

// --- Haftalık lider tablosu -----------------------------------------------------

/** Haftanın başlangıcı (Pazartesi 00:00, yerel saat). */
export function startOfWeekMs(now: Millis): Millis {
  const d = new Date(now);
  const sinceMonday = (d.getDay() + 6) % 7; // Pzt=0 … Paz=6
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - sinceMonday).getTime();
}

/**
 * Bu hafta tamamlanan görevlerden üye başına puan toplar
 * (puan tamamlayan kişiye yazılır).
 */
export function weeklyPoints(tasks: Task[], now: Millis): Map<string, number> {
  const weekStart = startOfWeekMs(now);
  const totals = new Map<string, number>();
  for (const task of tasks) {
    if (task.status !== 'done' || !task.completedBy) continue;
    if (task.completedAtMs == null || task.completedAtMs < weekStart) continue;
    totals.set(task.completedBy, (totals.get(task.completedBy) ?? 0) + task.points);
  }
  return totals;
}
