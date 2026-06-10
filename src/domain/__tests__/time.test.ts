import {
  dayKeyFromMs,
  isConsecutiveDay,
  isWithinQuietHours,
} from '../time';

describe('time', () => {
  it('epoch ms den yerel gün anahtarı üretir', () => {
    const ms = new Date(2026, 5, 10, 14, 30).getTime(); // 10 Haziran 2026
    expect(dayKeyFromMs(ms)).toBe('2026-06-10');
  });

  it('gündüz saatlerini sessiz aralık dışında sayar', () => {
    const start = { hour: 22, minute: 0 };
    const end = { hour: 7, minute: 0 };
    expect(isWithinQuietHours({ hour: 14, minute: 0 }, start, end)).toBe(false);
  });

  it('gece yarısını aşan sessiz aralığı doğru hesaplar', () => {
    const start = { hour: 22, minute: 0 };
    const end = { hour: 7, minute: 0 };
    expect(isWithinQuietHours({ hour: 23, minute: 30 }, start, end)).toBe(true);
    expect(isWithinQuietHours({ hour: 6, minute: 0 }, start, end)).toBe(true);
    expect(isWithinQuietHours({ hour: 7, minute: 0 }, start, end)).toBe(false);
  });

  it('aralık tanımlı değilse sessiz saat yoktur', () => {
    expect(isWithinQuietHours({ hour: 3, minute: 0 })).toBe(false);
  });

  it('ardışık günleri tanır', () => {
    expect(isConsecutiveDay('2026-06-10', '2026-06-11')).toBe(true);
    expect(isConsecutiveDay('2026-06-10', '2026-06-12')).toBe(false);
    expect(isConsecutiveDay('2026-06-30', '2026-07-01')).toBe(true);
  });
});
