import {
  addDaysToKey,
  describeRecurrenceTr,
  nextOccurrenceDayKey,
  occurrenceDueAt,
} from '../recurrence';

describe('nextOccurrenceDayKey', () => {
  it('daily: ertesi günü verir, başlangıçtan önceye düşmez', () => {
    const rule = { frequency: 'daily' as const, startDayKey: '2026-06-10' };
    expect(nextOccurrenceDayKey(rule, '2026-06-10')).toBe('2026-06-11');
    expect(nextOccurrenceDayKey(rule, '2026-06-01')).toBe('2026-06-10');
  });

  it('interval: başlangıca demirli N günde bir', () => {
    const rule = {
      frequency: 'interval' as const,
      interval: 3,
      startDayKey: '2026-06-10',
    };
    expect(nextOccurrenceDayKey(rule, '2026-06-10')).toBe('2026-06-13');
    expect(nextOccurrenceDayKey(rule, '2026-06-11')).toBe('2026-06-13');
    expect(nextOccurrenceDayKey(rule, '2026-06-13')).toBe('2026-06-16');
    expect(nextOccurrenceDayKey(rule, '2026-06-01')).toBe('2026-06-10');
  });

  it('weekly: seçili günlerden sonrakini bulur', () => {
    // 2026-06-10 Çarşamba. Pzt(1) ve Cum(5) seçili.
    const rule = {
      frequency: 'weekly' as const,
      weekdays: [1, 5],
      startDayKey: '2026-06-08',
    };
    expect(nextOccurrenceDayKey(rule, '2026-06-10')).toBe('2026-06-12'); // Cuma
    expect(nextOccurrenceDayKey(rule, '2026-06-12')).toBe('2026-06-15'); // Pzt
  });

  it('weekly: gün seçilmemişse başlangıcın haftalık günü kullanılır', () => {
    // 2026-06-10 Çarşamba
    const rule = { frequency: 'weekly' as const, startDayKey: '2026-06-10' };
    expect(nextOccurrenceDayKey(rule, '2026-06-10')).toBe('2026-06-17');
  });

  it('monthly: ay sonuna kıstırır (31 → Şubat 28)', () => {
    const rule = {
      frequency: 'monthly' as const,
      monthDay: 31,
      startDayKey: '2026-01-31',
    };
    expect(nextOccurrenceDayKey(rule, '2026-01-31')).toBe('2026-02-28');
    expect(nextOccurrenceDayKey(rule, '2026-02-28')).toBe('2026-03-31');
  });

  it('endDayKey aşılırsa null döner', () => {
    const rule = {
      frequency: 'daily' as const,
      startDayKey: '2026-06-10',
      endDayKey: '2026-06-11',
    };
    expect(nextOccurrenceDayKey(rule, '2026-06-10')).toBe('2026-06-11');
    expect(nextOccurrenceDayKey(rule, '2026-06-11')).toBeNull();
  });
});

describe('occurrenceDueAt', () => {
  it('saatliyse o saate kurar', () => {
    const { dueAtMs, hasTime } = occurrenceDueAt('2026-06-12', { hour: 18, minute: 30 });
    const d = new Date(dueAtMs);
    expect(hasTime).toBe(true);
    expect([d.getHours(), d.getMinutes()]).toEqual([18, 30]);
  });

  it('saatsizse öğlene kurar (hasTime=false)', () => {
    const { dueAtMs, hasTime } = occurrenceDueAt('2026-06-12');
    expect(hasTime).toBe(false);
    expect(new Date(dueAtMs).getHours()).toBe(12);
  });
});

describe('describeRecurrenceTr', () => {
  it('kalıpları Türkçe özetler', () => {
    expect(describeRecurrenceTr({ frequency: 'daily' })).toBe('Her gün');
    expect(describeRecurrenceTr({ frequency: 'interval', interval: 3 })).toBe(
      'Her 3 günde bir',
    );
    expect(
      describeRecurrenceTr({ frequency: 'weekly', weekdays: [1, 2, 3, 4, 5] }),
    ).toBe('Hafta içi her gün');
    expect(describeRecurrenceTr({ frequency: 'weekly', weekdays: [5, 1] })).toBe(
      'Her hafta: Pzt, Cum',
    );
    expect(describeRecurrenceTr({ frequency: 'monthly', monthDay: 15 })).toBe(
      'Her ayın 15. günü',
    );
  });
});

describe('addDaysToKey', () => {
  it('ay/yıl sınırlarını aşar', () => {
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
  });
});
