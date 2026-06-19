import {
  advanceStreak,
  computeCompletionReward,
  levelForPoints,
  levelProgress,
  newlyEarnedBadges,
  pointsForTask,
  pointsToNextLevel,
  shoppingListPoints,
  startOfWeekMs,
  weeklyPoints,
} from '../gamification';
import type { ShoppingList, Task } from '../types';

describe('gamification', () => {
  it('efor tabanı × öncelik çarpanı ile puan verir', () => {
    // Varsayılan zorluk orta (taban 12)
    expect(pointsForTask('low')).toBe(11); // 12 × 0.9 = 10.8 → 11
    expect(pointsForTask('medium')).toBe(12); // 12 × 1.0
    expect(pointsForTask('high')).toBe(14); // 12 × 1.15 = 13.8 → 14
    expect(pointsForTask('urgent')).toBe(16); // 12 × 1.3 = 15.6 → 16
    // Zorluk tabanı belirler — "çöp at" (kolay) vs "banyo" (zor)
    expect(pointsForTask('low', 'easy')).toBe(5); // 6 × 0.9 = 5.4 → 5
    expect(pointsForTask('urgent', 'easy')).toBe(8); // 6 × 1.3 = 7.8 → 8
    expect(pointsForTask('medium', 'hard')).toBe(20); // 20 × 1.0
    expect(pointsForTask('urgent', 'hard')).toBe(26); // 20 × 1.3
  });

  it('alışveriş listesi puanını ürün sayısına göre sınırlar', () => {
    expect(shoppingListPoints(0)).toBe(0);
    expect(shoppingListPoints(1)).toBe(5); // alt sınır
    expect(shoppingListPoints(4)).toBe(12); // 4 × 3
    expect(shoppingListPoints(10)).toBe(30); // üst sınır
    expect(shoppingListPoints(20)).toBe(30); // üst sınır korunur
  });

  it('puandan seviye hesaplar (1 tabanlı)', () => {
    expect(levelForPoints(0)).toBe(1);
    expect(levelForPoints(50)).toBe(1);
    expect(levelForPoints(99)).toBe(1);
    expect(levelForPoints(100)).toBe(2);
    expect(levelForPoints(250)).toBe(3);
  });

  it('seviye ilerlemesini 0..1 arası verir', () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(50)).toBeCloseTo(0.5);
    expect(levelProgress(100)).toBe(0);
    expect(levelProgress(175)).toBeCloseTo(0.75);
  });

  it('bir sonraki seviyeye kalan puanı verir', () => {
    expect(pointsToNextLevel(0)).toBe(100);
    expect(pointsToNextLevel(40)).toBe(60);
    expect(pointsToNextLevel(100)).toBe(100);
  });
});

describe('advanceStreak', () => {
  it('aynı gün tekrar tamamlamada değişmez', () => {
    const s = { streakCount: 4, lastActiveDayKey: '2026-06-10' };
    expect(advanceStreak(s, '2026-06-10')).toEqual(s);
  });

  it('ardışık günde artar', () => {
    expect(
      advanceStreak({ streakCount: 4, lastActiveDayKey: '2026-06-10' }, '2026-06-11'),
    ).toEqual({ streakCount: 5, lastActiveDayKey: '2026-06-11' });
  });

  it('boşlukta 1 e döner; ilk tamamlamada 1 başlar', () => {
    expect(
      advanceStreak({ streakCount: 9, lastActiveDayKey: '2026-06-05' }, '2026-06-10'),
    ).toEqual({ streakCount: 1, lastActiveDayKey: '2026-06-10' });
    expect(advanceStreak({ streakCount: 0 }, '2026-06-10')).toEqual({
      streakCount: 1,
      lastActiveDayKey: '2026-06-10',
    });
  });
});

describe('newlyEarnedBadges', () => {
  it('eşik geçen ve sahip olunmayan rozetleri verir', () => {
    const earned = newlyEarnedBadges(
      { tasksCompleted: 1, points: 10, streakCount: 1 },
      [],
    );
    expect(earned.map((b) => b.key)).toEqual(['first_task']);
  });

  it('sahip olunanları tekrar vermez', () => {
    const earned = newlyEarnedBadges(
      { tasksCompleted: 30, points: 600, streakCount: 7 },
      ['first_task', 'tasks_25', 'streak_3'],
    );
    expect(earned.map((b) => b.key).sort()).toEqual(['points_500', 'streak_7']);
  });
});

describe('weeklyPoints', () => {
  const NOW = new Date(2026, 5, 10, 12, 0).getTime(); // 10 Haziran 2026 Çarşamba
  const mkDone = (uid: string, points: number, at: number): Task =>
    ({
      id: 'x',
      householdId: 'h',
      title: 't',
      priority: 'medium',
      status: 'done',
      hasTime: false,
      assigneeIds: [],
      subtasks: [],
      points,
      attachmentsCount: 0,
      commentsCount: 0,
      createdBy: uid,
      createdAtMs: at,
      completedBy: uid,
      completedAtMs: at,
    }) as Task;

  it('haftanın başı pazartesidir', () => {
    const start = new Date(startOfWeekMs(NOW));
    expect(start.getDay()).toBe(1); // Pazartesi
    expect(start.getDate()).toBe(8); // 8 Haziran
  });

  it('yalnızca bu haftakileri üye bazında toplar', () => {
    const monday = new Date(2026, 5, 8, 9, 0).getTime();
    const lastWeek = new Date(2026, 5, 5, 9, 0).getTime();
    const totals = weeklyPoints(
      [mkDone('a', 10, monday), mkDone('a', 15, NOW), mkDone('b', 20, NOW), mkDone('b', 99, lastWeek)],
      [],
      NOW,
    );
    expect(totals.get('a')).toBe(25);
    expect(totals.get('b')).toBe(20);
  });

  it('bu hafta tamamlanan alışveriş listelerini de katar (awardedPoints)', () => {
    const mkList = (uid: string, pts: number, at: number): ShoppingList =>
      ({
        id: 'l',
        householdId: 'h',
        name: 'Migros',
        status: 'done',
        createdBy: uid,
        createdAtMs: at,
        completedBy: uid,
        completedAtMs: at,
        awardedPoints: pts,
      }) as ShoppingList;
    const lastWeek = new Date(2026, 5, 5, 9, 0).getTime();
    const totals = weeklyPoints(
      [mkDone('a', 10, NOW)],
      [mkList('a', 15, NOW), mkList('b', 30, NOW), mkList('b', 99, lastWeek)],
      NOW,
    );
    expect(totals.get('a')).toBe(25); // 10 görev + 15 alışveriş
    expect(totals.get('b')).toBe(30); // yalnız bu haftaki liste
  });
});

describe('computeCompletionReward', () => {
  const TODAY = '2026-06-10';

  it('görev tamamlamada görev rozetini sayar (ilk görev rozeti)', () => {
    const r = computeCompletionReward({
      member: { points: 0, tasksCompleted: 0, streakCount: 0 },
      pointsDelta: 12,
      todayKey: TODAY,
      countsTowardTaskBadges: true,
    });
    expect(r.afterPoints).toBe(12);
    expect(r.newBadges.map((b) => b.key)).toContain('first_task'); // tasksCompleted 0+1 ≥ 1
  });

  it('alışveriş tamamlamada görev rozeti VERİLMEZ (adalet)', () => {
    const r = computeCompletionReward({
      member: { points: 0, tasksCompleted: 0, streakCount: 0 },
      pointsDelta: 12,
      todayKey: TODAY,
      countsTowardTaskBadges: false,
    });
    expect(r.newBadges.map((b) => b.key)).not.toContain('first_task');
  });

  it('puan rozetleri her iki türde de verilir (görev sayacından bağımsız)', () => {
    const r = computeCompletionReward({
      member: { points: 495, tasksCompleted: 0, streakCount: 0 },
      pointsDelta: 12,
      todayKey: TODAY,
      countsTowardTaskBadges: false,
    });
    expect(r.afterPoints).toBe(507);
    expect(r.newBadges.map((b) => b.key)).toContain('points_500');
    expect(r.levelBefore).toBe(levelForPoints(495));
    expect(r.levelAfter).toBe(levelForPoints(507));
  });

  it('seriyi ilerletir', () => {
    const r = computeCompletionReward({
      member: { points: 0, streakCount: 2, lastActiveDayKey: '2026-06-09' },
      pointsDelta: 5,
      todayKey: TODAY,
      countsTowardTaskBadges: true,
    });
    expect(r.streak.streakCount).toBe(3);
  });
});
