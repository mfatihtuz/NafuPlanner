import {
  advanceStreak,
  levelForPoints,
  levelProgress,
  newlyEarnedBadges,
  pointsForTask,
  pointsToNextLevel,
  startOfWeekMs,
  weeklyPoints,
} from '../gamification';
import type { Task } from '../types';

describe('gamification', () => {
  it('önceliğe göre puan verir', () => {
    expect(pointsForTask('low')).toBe(5);
    expect(pointsForTask('medium')).toBe(10);
    expect(pointsForTask('high')).toBe(15);
    expect(pointsForTask('urgent')).toBe(20);
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
      NOW,
    );
    expect(totals.get('a')).toBe(25);
    expect(totals.get('b')).toBe(20);
  });
});
