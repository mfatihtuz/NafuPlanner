import { formatClock, formatDueLabel, formatShortDate } from '../format';

const NOW = new Date(2026, 5, 10, 12, 0).getTime(); // 10 Haziran 2026
const DAY = 86_400_000;

describe('format', () => {
  it('saat biçimler', () => {
    expect(formatClock(9, 5)).toBe('09:05');
    expect(formatClock(18, 30)).toBe('18:30');
  });

  it('kısa tarih biçimler', () => {
    expect(formatShortDate(NOW)).toBe('10 Haziran');
  });

  it('göreli gün etiketleri üretir', () => {
    expect(formatDueLabel(NOW, false, NOW)).toBe('Bugün');
    expect(formatDueLabel(NOW + DAY, false, NOW)).toBe('Yarın');
    expect(formatDueLabel(NOW - DAY, false, NOW)).toBe('Dün');
    expect(formatDueLabel(NOW + 5 * DAY, false, NOW)).toBe('15 Haziran');
  });

  it('saatli etikete saati ekler', () => {
    const at = new Date(2026, 5, 10, 14, 30).getTime();
    expect(formatDueLabel(at, true, NOW)).toBe('Bugün · 14:30');
  });
});
