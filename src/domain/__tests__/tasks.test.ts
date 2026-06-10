import { groupTasks, subtaskProgress } from '../tasks';
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
