import { shoppingListsDue } from '../shopping';
import type { ShoppingList } from '../types';

const NOW = new Date(2026, 5, 10, 12, 0).getTime(); // 10 Haziran 2026
const DAY = 86_400_000;

let seq = 0;
function makeList(partial: Partial<ShoppingList>): ShoppingList {
  seq += 1;
  return {
    id: `l${seq}`,
    householdId: 'h1',
    name: `Liste ${seq}`,
    status: 'active',
    createdBy: 'u1',
    createdAtMs: NOW - seq * 1000,
    ...partial,
  };
}

describe('shoppingListsDue', () => {
  it('aktif + tarihli listeleri geciken/bugün olarak ayırır, tarihe göre sıralar', () => {
    const overdueA = makeList({ dueAtMs: NOW - 2 * DAY });
    const overdueB = makeList({ dueAtMs: NOW - DAY });
    const todayEarly = makeList({ dueAtMs: NOW - 3_600_000 }); // bugün, sabah
    const todayLate = makeList({ dueAtMs: NOW + 5 * 3_600_000 });
    const future = makeList({ dueAtMs: NOW + 3 * DAY });
    const noDate = makeList({});
    const doneToday = makeList({ status: 'done', dueAtMs: NOW });

    const due = shoppingListsDue(
      [overdueB, overdueA, todayLate, todayEarly, future, noDate, doneToday],
      NOW,
    );

    expect(due.overdue.map((l) => l.id)).toEqual([overdueA.id, overdueB.id]); // tarihe göre artan
    expect(due.today.map((l) => l.id)).toEqual([todayEarly.id, todayLate.id]);
  });

  it('tamamlanan ve tarihsiz listeleri dışarıda bırakır', () => {
    const due = shoppingListsDue(
      [makeList({ status: 'done', dueAtMs: NOW }), makeList({})],
      NOW,
    );
    expect(due.overdue).toHaveLength(0);
    expect(due.today).toHaveLength(0);
  });
});
