import {
  groceryAisle,
  groupItemsByAisle,
  monthlySpend,
  shoppingListsDue,
  suggestItemNames,
} from '../shopping';
import type { ShoppingItem, ShoppingList } from '../types';

const NOW = new Date(2026, 5, 10, 12, 0).getTime(); // 10 Haziran 2026
const DAY = 86_400_000;
const ME = 'me';

let seq = 0;
function makeList(partial: Partial<ShoppingList>): ShoppingList {
  seq += 1;
  return {
    id: `l${seq}`,
    householdId: 'h1',
    name: `Liste ${seq}`,
    status: 'active',
    createdBy: ME,
    createdAtMs: NOW - seq * 1000,
    ...partial,
  };
}

describe('shoppingListsDue', () => {
  it('tarihli listeleri geciken/bugün olarak ayırır, tarihe göre sıralar', () => {
    const overdueA = makeList({ dueAtMs: NOW - 2 * DAY, createdBy: 'x' });
    const overdueB = makeList({ dueAtMs: NOW - DAY, createdBy: 'x' });
    const todayEarly = makeList({ dueAtMs: NOW - 3_600_000, createdBy: 'x' });
    const todayLate = makeList({ dueAtMs: NOW + 5 * 3_600_000, createdBy: 'x' });
    const future = makeList({ dueAtMs: NOW + 3 * DAY, createdBy: 'x' });

    const due = shoppingListsDue([overdueB, overdueA, todayLate, todayEarly, future], NOW, ME);

    expect(due.overdue.map((l) => l.id)).toEqual([overdueA.id, overdueB.id]);
    // Tarihli bugünküler saate göre; tarihliler tarihsizlerden önce.
    expect(due.today.map((l) => l.id)).toEqual([todayEarly.id, todayLate.id]);
  });

  it('tarihsiz ama bana ait/atanmış listeleri bugüne koyar (TODO mantığı)', () => {
    const mineCreated = makeList({ createdBy: ME }); // tarihsiz, benim
    const assignedToMe = makeList({ createdBy: 'x', assigneeId: ME }); // tarihsiz, bana atanmış
    const othersUnassigned = makeList({ createdBy: 'x' }); // tarihsiz, başkasının → görünmez
    const assignedToOther = makeList({ createdBy: ME, assigneeId: 'x' }); // bana ait değil → görünmez

    const due = shoppingListsDue(
      [mineCreated, assignedToMe, othersUnassigned, assignedToOther],
      NOW,
      ME,
    );

    expect(due.overdue).toHaveLength(0);
    expect(due.today.map((l) => l.id).sort()).toEqual([assignedToMe.id, mineCreated.id].sort());
  });

  it('gelecek tarihli liste bana ait olsa da gösterilmez (o güne planlı)', () => {
    const future = makeList({ createdBy: ME, dueAtMs: NOW + 3 * DAY });
    const due = shoppingListsDue([future], NOW, ME);
    expect(due.today).toHaveLength(0);
    expect(due.overdue).toHaveLength(0);
  });

  it('tamamlanan listeleri dışarıda bırakır', () => {
    const due = shoppingListsDue(
      [makeList({ status: 'done', dueAtMs: NOW }), makeList({ status: 'done' })],
      NOW,
      ME,
    );
    expect(due.overdue).toHaveLength(0);
    expect(due.today).toHaveLength(0);
  });

  it('uid yoksa yalnız tarihli listeleri döndürür', () => {
    const mineUndated = makeList({ createdBy: ME });
    const datedToday = makeList({ dueAtMs: NOW, createdBy: 'x' });
    const due = shoppingListsDue([mineUndated, datedToday], NOW, null);
    expect(due.today.map((l) => l.id)).toEqual([datedToday.id]);
  });
});

let iseq = 0;
function makeItem(name: string, addedAtMs: number, checked = false): ShoppingItem {
  iseq += 1;
  return {
    id: `i${iseq}`,
    householdId: 'h1',
    name,
    checked,
    addedBy: ME,
    addedAtMs,
  };
}

describe('suggestItemNames', () => {
  it('sıklığa göre sıralar, eşitlikte yeni olan; listedekini eler', () => {
    const history = [
      makeItem('Süt', 100),
      makeItem('Süt', 300),
      makeItem('Ekmek', 200),
      makeItem('Yumurta', 400),
    ];
    // Süt 2 kez (en sık) → ilk; sonra tekil olanlar yeniye göre (Yumurta>Ekmek).
    expect(suggestItemNames(history, '', [], 6)).toEqual(['Süt', 'Yumurta', 'Ekmek']);
    // Zaten listede olan elenir.
    expect(suggestItemNames(history, '', ['süt'], 6)).toEqual(['Yumurta', 'Ekmek']);
  });

  it('taslak metnine göre süzer (büyük/küçük harf duyarsız)', () => {
    const history = [makeItem('Süt', 100), makeItem('Ekmek', 200), makeItem('Peçete', 300)];
    expect(suggestItemNames(history, 'ek', [], 6)).toEqual(['Ekmek']);
  });
});

describe('groceryAisle / groupItemsByAisle', () => {
  it('ürünleri reyona ayırır', () => {
    expect(groceryAisle('domates')).toBe('manav');
    expect(groceryAisle('tavuk but')).toBe('kasap');
    expect(groceryAisle('Süt')).toBe('sutKahvalti');
    expect(groceryAisle('bulaşık deterjanı')).toBe('temizlik');
    expect(groceryAisle('havlu')).toBe('temizlik');
    expect(groceryAisle('bilinmeyen şey')).toBe('diger');
  });

  it('markette dolaşma sırasıyla gruplar', () => {
    const groups = groupItemsByAisle([
      makeItem('deterjan', 1),
      makeItem('elma', 2),
      makeItem('süt', 3),
    ]);
    // manav < sutKahvalti < temizlik sırası
    expect(groups.map((g) => g.aisle)).toEqual(['manav', 'sutKahvalti', 'temizlik']);
  });
});

describe('monthlySpend', () => {
  it('yalnız bu ayki harcamaları toplar', () => {
    const thisMonth = makeList({ spentAmount: 250, completedAtMs: NOW });
    const alsoThisMonth = makeList({ spentAmount: 100, completedAtMs: new Date(2026, 5, 2).getTime() });
    const lastMonth = makeList({ spentAmount: 999, completedAtMs: new Date(2026, 4, 20).getTime() });
    const noSpend = makeList({ completedAtMs: NOW });
    expect(monthlySpend([thisMonth, alsoThisMonth, lastMonth, noSpend], NOW)).toBe(350);
  });
});
