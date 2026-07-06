import type { ClockTime, DayKey, Millis } from './types';

/**
 * Saf zaman yardımcıları. Yerel saat dilimine göre çalışır (cihazın saati).
 */

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Bir tarihten yerel "YYYY-MM-DD" gün anahtarı üretir. */
export function dayKeyFromDate(date: Date): DayKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Epoch ms'den yerel gün anahtarı. */
export function dayKeyFromMs(ms: Millis): DayKey {
  return dayKeyFromDate(new Date(ms));
}

/** Bugünün gün anahtarı. */
export function todayKey(now: Millis = Date.now()): DayKey {
  return dayKeyFromMs(now);
}

const minutesOf = (t: ClockTime) => t.hour * 60 + t.minute;

/**
 * Verilen zaman sessiz saat aralığında mı? Aralık gece yarısını aşabilir
 * (örn. 22:00–07:00).
 */
export function isWithinQuietHours(
  at: ClockTime,
  start?: ClockTime,
  end?: ClockTime,
): boolean {
  if (!start || !end) return false;
  const a = minutesOf(at);
  const s = minutesOf(start);
  const e = minutesOf(end);
  if (s === e) return false;
  if (s < e) return a >= s && a < e;
  // Gece yarısını aşan aralık
  return a >= s || a < e;
}

/** İki gün anahtarı ardışık mı (seri/streak için)? */
export function isConsecutiveDay(previous: DayKey, current: DayKey): boolean {
  const prev = new Date(`${previous}T00:00:00`);
  const cur = new Date(`${current}T00:00:00`);
  const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
  return diffDays === 1;
}

/**
 * Gün anahtarı (+ opsiyonel saat) → son tarih ms + hasTime. Saat verilmezse
 * gün ortası (12:00) kullanılır (gruplama gün anahtarına göre yapılır).
 */
export function dueAtFromDayKey(
  dayKey: DayKey,
  time?: ClockTime | null,
): { dueAtMs: Millis; hasTime: boolean } {
  const [y, m, d] = dayKey.split('-').map(Number);
  if (time) {
    return { dueAtMs: new Date(y, m - 1, d, time.hour, time.minute).getTime(), hasTime: true };
  }
  return { dueAtMs: new Date(y, m - 1, d, 12, 0).getTime(), hasTime: false };
}
