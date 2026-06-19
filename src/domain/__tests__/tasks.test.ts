import {
  canDecideCompletion,
  canDecideReopen,
  completionNeedsApproval,
  groupTasks,
  reopenNeedsApproval,
  snoozeDayKeys,
  subtaskProgress,
} from '../tasks';
import type { Task } from '../types';

const NOW = new Date(2026, 5, 10, 12, 0).getTime(); // 10 Haziran 2026 öğlen
const DAY = 86_400_000;

let seq = 0;
function makeTask(partial: Partial<Task>): Task {
  seq += 1;
  return {
    id: `t${seq}`,
    householdId: 'h1',
    title: `Görev ${seq}`,
    priority: 'medium',
    status: 'open',
    hasTime: false,
    assigneeIds: [],
    subtasks: [],
    points: 10,
    attachmentsCount: 0,
    commentsCount: 0,
    createdBy: 'u1',
    createdAtMs: NOW - seq * 1000,
    ...partial,
  };
}

describe('groupTasks', () => {
  it('görevleri bölümlere ayırır', () => {
    const overdue = makeTask({ dueAtMs: NOW - 2 * DAY });
    const today = makeTask({ dueAtMs: NOW + 60_000 });
    const upcoming = makeTask({ dueAtMs: NOW + 3 * DAY });
    const noDate = makeTask({});
    const done = makeTask({ status: 'done', completedAtMs: NOW });

    const s = groupTasks([overdue, today, upcoming, noDate, done], NOW);
    expect(s.overdue.map((t) => t.id)).toEqual([overdue.id]);
    expect(s.today.map((t) => t.id)).toEqual([today.id]);
    expect(s.upcoming.map((t) => t.id)).toEqual([upcoming.id]);
    expect(s.noDate.map((t) => t.id)).toEqual([noDate.id]);
    expect(s.done.map((t) => t.id)).toEqual([done.id]);
  });

  it('bugün: saatli görevler önce, sonra öncelik', () => {
    const noTimeHigh = makeTask({ dueAtMs: NOW, hasTime: false, priority: 'high' });
    const lateTime = makeTask({ dueAtMs: NOW + 6 * 3_600_000, hasTime: true });
    const earlyTime = makeTask({ dueAtMs: NOW + 3_600_000, hasTime: true });
    const noTimeLow = makeTask({ dueAtMs: NOW, hasTime: false, priority: 'low' });

    const s = groupTasks([noTimeLow, lateTime, noTimeHigh, earlyTime], NOW);
    expect(s.today.map((t) => t.id)).toEqual([
      earlyTime.id,
      lateTime.id,
      noTimeHigh.id,
      noTimeLow.id,
    ]);
  });

  it('arşivlenmişleri dışarıda bırakır', () => {
    const archived = makeTask({ status: 'archived' });
    const s = groupTasks([archived], NOW);
    expect(s.noDate).toHaveLength(0);
    expect(s.done).toHaveLength(0);
  });
});

describe('subtaskProgress', () => {
  it('tamamlanan/toplam sayar', () => {
    const task = makeTask({
      subtasks: [
        { id: 's1', title: 'a', done: true },
        { id: 's2', title: 'b', done: false },
        { id: 's3', title: 'c', done: true },
      ],
    });
    expect(subtaskProgress(task)).toEqual([2, 3]);
  });
});

describe('reopenNeedsApproval', () => {
  const done = (completedBy: string) =>
    makeTask({ status: 'done', completedBy, completedAtMs: NOW });

  it('başkasının tamamladığı görevde onay ister', () => {
    expect(reopenNeedsApproval(done('u1'), 'u2', 2)).toBe(true);
  });

  it('kendi tamamladığın görevde onay istemez', () => {
    expect(reopenNeedsApproval(done('u1'), 'u1', 2)).toBe(false);
  });

  it('tek üyeli hanede onay istemez (onaylayacak kimse yok)', () => {
    expect(reopenNeedsApproval(done('u1'), 'u2', 1)).toBe(false);
  });

  it('tamamlayanı bilinmeyen görevde onay istemez', () => {
    expect(reopenNeedsApproval(makeTask({ status: 'done' }), 'u2', 2)).toBe(false);
  });

  it('açık görevde onay istemez', () => {
    expect(reopenNeedsApproval(makeTask({}), 'u2', 2)).toBe(false);
  });
});

describe('canDecideReopen', () => {
  it('isteyen kendi isteğini karara bağlayamaz', () => {
    const task = makeTask({ status: 'done', completedBy: 'u1', reopenRequestedBy: 'u2' });
    expect(canDecideReopen(task, 'u2')).toBe(false);
  });

  it('diğer üye karara bağlayabilir', () => {
    const task = makeTask({ status: 'done', completedBy: 'u1', reopenRequestedBy: 'u2' });
    expect(canDecideReopen(task, 'u1')).toBe(true);
  });

  it('istek yoksa karar da yoktur', () => {
    expect(canDecideReopen(makeTask({ status: 'done', completedBy: 'u1' }), 'u1')).toBe(false);
  });
});

describe('completionNeedsApproval', () => {
  it('atanmamış biri başkasının görevini tamamlıyorsa onay ister', () => {
    const task = makeTask({ assigneeIds: ['u1'] });
    expect(completionNeedsApproval(task, 'u2', 2)).toBe(true);
  });

  it('atanan kişi kendi görevini onaysız tamamlar', () => {
    const task = makeTask({ assigneeIds: ['u1'] });
    expect(completionNeedsApproval(task, 'u1', 2)).toBe(false);
  });

  it('atanmamış (paylaşılan) görev onaysız tamamlanır', () => {
    const task = makeTask({ assigneeIds: [] });
    expect(completionNeedsApproval(task, 'u2', 2)).toBe(false);
  });

  it('tek üyeli hanede onay istemez (onaylayacak kimse yok)', () => {
    const task = makeTask({ assigneeIds: ['u1'] });
    expect(completionNeedsApproval(task, 'u2', 1)).toBe(false);
  });

  it('zaten tamamlanmış görevde onay istemez', () => {
    const task = makeTask({ status: 'done', assigneeIds: ['u1'] });
    expect(completionNeedsApproval(task, 'u2', 2)).toBe(false);
  });
});

describe('canDecideCompletion', () => {
  it('atanan kişi bekleyen tamamlamayı karara bağlayabilir', () => {
    const task = makeTask({ assigneeIds: ['u1'], pendingCompleteBy: 'u2' });
    expect(canDecideCompletion(task, 'u1')).toBe(true);
  });

  it('isteyen kendi tamamlamasını onaylayamaz', () => {
    const task = makeTask({ assigneeIds: ['u1'], pendingCompleteBy: 'u2' });
    expect(canDecideCompletion(task, 'u2')).toBe(false);
  });

  it('atanmamış üçüncü kişi karara bağlayamaz', () => {
    const task = makeTask({ assigneeIds: ['u1'], pendingCompleteBy: 'u2' });
    expect(canDecideCompletion(task, 'u3')).toBe(false);
  });

  it('bekleyen istek yoksa karar da yoktur', () => {
    const task = makeTask({ assigneeIds: ['u1'] });
    expect(canDecideCompletion(task, 'u1')).toBe(false);
  });
});

describe('snoozeDayKeys', () => {
  it('Çarşamba için yarın/hafta sonu/gelecek hafta doğru', () => {
    // NOW = 10 Haziran 2026 Çarşamba
    const keys = snoozeDayKeys(NOW);
    expect(keys.tomorrow).toBe('2026-06-11'); // Perşembe
    expect(keys.weekend).toBe('2026-06-13'); // bu Cumartesi
    expect(keys.nextWeek).toBe('2026-06-15'); // gelecek Pazartesi
  });

  it('Cumartesi ise hafta sonu bir sonraki Cumartesi olur', () => {
    const saturday = new Date(2026, 5, 13, 12, 0).getTime();
    const keys = snoozeDayKeys(saturday);
    expect(keys.tomorrow).toBe('2026-06-14');
    expect(keys.weekend).toBe('2026-06-20'); // hep ileri
    expect(keys.nextWeek).toBe('2026-06-15');
  });
});
