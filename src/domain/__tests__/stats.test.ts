import { categoryDoneCounts, dailyDoneCounts } from '../stats';
import type { Task } from '../types';

const NOW = new Date(2026, 5, 10, 12, 0).getTime(); // 10 Haziran 2026 Çarşamba
const DAY = 86_400_000;

let seq = 0;
function doneTask(at: number, categoryId?: string): Task {
  seq += 1;
  return {
    id: `t${seq}`,
    householdId: 'h',
    title: 't',
    priority: 'medium',
    status: 'done',
    hasTime: false,
    assigneeIds: [],
    subtasks: [],
    points: 10,
    attachmentsCount: 0,
    commentsCount: 0,
    createdBy: 'u',
    createdAtMs: at,
    completedBy: 'u',
    completedAtMs: at,
    categoryId,
  } as Task;
}

describe('dailyDoneCounts', () => {
  it('7 kova üretir, eski → bugün sırasıyla; doğru güne sayar', () => {
    const buckets = dailyDoneCounts(
      [doneTask(NOW), doneTask(NOW), doneTask(NOW - 2 * DAY), doneTask(NOW - 9 * DAY)],
      NOW,
    );
    expect(buckets).toHaveLength(7);
    expect(buckets[6].count).toBe(2); // bugün
    expect(buckets[4].count).toBe(1); // 2 gün önce
    expect(buckets[6].label).toBe('Çar');
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(3); // 9 gün önceki dışarıda
  });
});

describe('categoryDoneCounts', () => {
  it('pencere içindekileri kategoriye göre sayar; kategorisiz null anahtarında', () => {
    const totals = categoryDoneCounts(
      [
        doneTask(NOW, 'mutfak'),
        doneTask(NOW - DAY, 'mutfak'),
        doneTask(NOW - DAY),
        doneTask(NOW - 40 * DAY, 'mutfak'),
      ],
      NOW - 30 * DAY,
    );
    expect(totals.get('mutfak')).toBe(2);
    expect(totals.get(null)).toBe(1);
  });
});
