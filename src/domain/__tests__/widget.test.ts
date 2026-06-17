import type { Task } from '../types';
import { buildWidgetSnapshot, WIDGET_MAX_ITEMS } from '../widget';

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

describe('buildWidgetSnapshot', () => {
  it('boş listede sıfır sayar', () => {
    const snap = buildWidgetSnapshot([], NOW);
    expect(snap.todayTotal).toBe(0);
    expect(snap.todayDone).toBe(0);
    expect(snap.overdueOpen).toBe(0);
    expect(snap.items).toEqual([]);
    expect(snap.weekdayLabel).toBe('Çarşamba'); // 10 Haziran 2026 = Çarşamba
    expect(snap.dateLabel).toBe('10 Haziran');
  });

  it('geciken + bugün açık görevleri listeler, tamamlananı ilerlemeye sayar', () => {
    const overdue = makeTask({ dueAtMs: NOW - 2 * DAY }); // açık, gecikmiş
    const todayTimed = makeTask({ dueAtMs: NOW + 2 * 3_600_000, hasTime: true });
    const todayNoTime = makeTask({ dueAtMs: NOW, hasTime: false, priority: 'high' });
    const todayDone = makeTask({ status: 'done', dueAtMs: NOW, completedAtMs: NOW });
    const future = makeTask({ dueAtMs: NOW + 3 * DAY });
    const noDate = makeTask({});
    const archived = makeTask({ status: 'archived', dueAtMs: NOW });

    const snap = buildWidgetSnapshot(
      [overdue, todayTimed, todayNoTime, todayDone, future, noDate, archived],
      NOW,
    );

    // Bugüne planlı: timed + noTime + done = 3; tamamlanan = 1.
    expect(snap.todayTotal).toBe(3);
    expect(snap.todayDone).toBe(1);
    expect(snap.overdueOpen).toBe(1);

    // Eylem listesi: önce geciken, sonra bugün açık (tamamlanan/gelecek/tarihsiz hariç).
    expect(snap.items.map((i) => i.id)).toEqual([overdue.id, todayTimed.id, todayNoTime.id]);
    expect(snap.items[0].overdue).toBe(true);
    expect(snap.items[1].overdue).toBe(false);
    // Saatli görev "14:00" gösterir; saatsiz boş.
    expect(snap.items[1].timeLabel).toBe('14:00');
    expect(snap.items[2].timeLabel).toBe('');
    // Geciken görev gün etiketi taşır.
    expect(snap.items[0].timeLabel).toBe('8 Haziran');
  });

  it('eylem listesini kapaklar', () => {
    const many = Array.from({ length: 15 }, (_, k) =>
      makeTask({ dueAtMs: NOW + (k + 1) * 60_000, hasTime: true }),
    );
    const snap = buildWidgetSnapshot(many, NOW);
    expect(snap.items).toHaveLength(WIDGET_MAX_ITEMS);
    expect(snap.todayTotal).toBe(15);
  });
});
