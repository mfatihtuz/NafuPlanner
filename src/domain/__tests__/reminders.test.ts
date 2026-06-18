import {
  ESCALATION_DELAY_MS,
  buildDigestBody,
  buildTaskReminderTimes,
  nextDailyDigestMs,
  shiftOutOfQuietHours,
  shoppingReminderAt,
} from '../reminders';
import type { ShoppingList, UserSettings } from '../types';

const at = (h: number, m = 0) => new Date(2026, 5, 10, h, m).getTime(); // 10 Haziran 2026

const quiet: UserSettings = {
  quietHoursStart: { hour: 22, minute: 0 },
  quietHoursEnd: { hour: 7, minute: 0 },
  dailyDigestEnabled: false,
  nudgesEnabled: true,
};

describe('shiftOutOfQuietHours', () => {
  it('sessiz aralık dışındaysa dokunmaz', () => {
    expect(shiftOutOfQuietHours(at(12), quiet)).toBe(at(12));
  });

  it('gece tarafında ertesi sabaha kaydırır', () => {
    const shifted = shiftOutOfQuietHours(at(23), quiet);
    const d = new Date(shifted);
    expect([d.getDate(), d.getHours()]).toEqual([11, 7]);
  });

  it('sabah tarafında aynı gün bitişe kaydırır', () => {
    const shifted = shiftOutOfQuietHours(at(6, 30), quiet);
    const d = new Date(shifted);
    expect([d.getDate(), d.getHours()]).toEqual([10, 7]);
  });

  it('ayar yoksa dokunmaz', () => {
    expect(shiftOutOfQuietHours(at(23), null)).toBe(at(23));
  });
});

describe('buildTaskReminderTimes', () => {
  const baseTask = { status: 'open' as const, hasTime: true, dueAtMs: at(18) };

  it('son tarih + 30 dk kademesini üretir', () => {
    const times = buildTaskReminderTimes(baseTask, null, at(12));
    expect(times).toEqual([at(18), at(18) + ESCALATION_DELAY_MS]);
  });

  it('geçmiş anları eler', () => {
    const times = buildTaskReminderTimes(baseTask, null, at(18, 10));
    expect(times).toEqual([at(18) + ESCALATION_DELAY_MS]);
  });

  it('saatsiz veya kapalı görevler için boş döner', () => {
    expect(buildTaskReminderTimes({ ...baseTask, hasTime: false }, null, at(12))).toEqual([]);
    expect(
      buildTaskReminderTimes({ ...baseTask, status: 'done' as const }, null, at(12)),
    ).toEqual([]);
  });

  it('sessiz saate düşenleri kaydırıp tekilleştirir', () => {
    const lateTask = { status: 'open' as const, hasTime: true, dueAtMs: at(22, 30) };
    const times = buildTaskReminderTimes(lateTask, quiet, at(12));
    // Hem 22:30 hem 23:00 → ertesi 07:00'a kayar ve tekilleşir.
    expect(times).toHaveLength(1);
    const d = new Date(times[0]);
    expect([d.getDate(), d.getHours()]).toEqual([11, 7]);
  });
});

describe('nextDailyDigestMs', () => {
  it('kapalıysa null', () => {
    expect(nextDailyDigestMs(quiet, at(6))).toBeNull();
  });

  it('bugünkü saat gelmediyse bugüne kurar', () => {
    const s: UserSettings = {
      ...quiet,
      dailyDigestEnabled: true,
      dailyDigestTime: { hour: 8, minute: 0 },
    };
    const d = new Date(nextDailyDigestMs(s, at(6))!);
    expect([d.getDate(), d.getHours()]).toEqual([10, 8]);
  });

  it('geçtiyse yarına kurar', () => {
    const s: UserSettings = {
      ...quiet,
      dailyDigestEnabled: true,
      dailyDigestTime: { hour: 8, minute: 0 },
    };
    const d = new Date(nextDailyDigestMs(s, at(9))!);
    expect([d.getDate(), d.getHours()]).toEqual([11, 8]);
  });
});

describe('buildDigestBody', () => {
  it('boş listede kutlar', () => {
    expect(buildDigestBody([])).toContain('bekleyen görev yok');
  });

  it('ilk üç başlığı sayar, fazlasını özetler', () => {
    expect(buildDigestBody(['a', 'b'])).toBe('Bugün 2 görev seni bekliyor: a, b');
    expect(buildDigestBody(['a', 'b', 'c', 'd', 'e'])).toBe(
      'Bugün 5 görev seni bekliyor: a, b, c ve 2 görev daha',
    );
  });
});

describe('shoppingReminderAt', () => {
  const baseList = (partial: Partial<ShoppingList>): ShoppingList => ({
    id: 'l1',
    householdId: 'h1',
    name: 'Migros',
    status: 'active',
    createdBy: 'u1',
    createdAtMs: at(8),
    ...partial,
  });

  it('saatli listede tam o saatte hatırlatır', () => {
    const list = baseList({ dueAtMs: at(15, 30), hasTime: true });
    expect(shoppingReminderAt(list, null, at(9))).toBe(at(15, 30));
  });

  it('tarihsiz listede 09:00 kullanır', () => {
    const list = baseList({ dueAtMs: at(12), hasTime: false });
    expect(shoppingReminderAt(list, null, at(6))).toBe(at(9));
  });

  it('tamamlanan / tarihsiz / geçmiş listede null döner', () => {
    expect(shoppingReminderAt(baseList({ status: 'done', dueAtMs: at(15) }), null, at(9))).toBeNull();
    expect(shoppingReminderAt(baseList({}), null, at(9))).toBeNull();
    expect(shoppingReminderAt(baseList({ dueAtMs: at(8), hasTime: true }), null, at(9))).toBeNull();
  });

  it('sessiz saatteki hatırlatmayı sabaha kaydırır', () => {
    const list = baseList({ dueAtMs: at(23, 0), hasTime: true });
    // 10 Haziran 23:00 sessiz aralıkta → ertesi sabah 07:00'a kayar.
    const nextMorning = new Date(2026, 5, 11, 7, 0).getTime();
    expect(shoppingReminderAt(list, quiet, at(20))).toBe(nextMorning);
  });
});
