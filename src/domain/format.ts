import { MONTHS_TR } from './constants';
import { dayKeyFromMs } from './time';
import type { DayKey, Millis } from './types';

/**
 * Türkçe tarih/saat biçimleme yardımcıları (saf).
 */

const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatClock(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

/** "12 Haziran" gibi kısa tarih. */
export function formatShortDate(ms: Millis): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]}`;
}

/** Gün anahtarından kısa tarih ("12 Haziran"). */
export function formatDayKey(dayKey: DayKey): string {
  const [, m, d] = dayKey.split('-').map(Number);
  return `${d} ${MONTHS_TR[(m ?? 1) - 1]}`;
}

/**
 * Son tarih etiketi: "Bugün", "Yarın", "Dün" ya da "12 Haziran";
 * saatliyse sonuna "· 14:30" eklenir.
 */
export function formatDueLabel(dueAtMs: Millis, hasTime: boolean, now: Millis): string {
  const DAY = 86_400_000;
  const dueKey = dayKeyFromMs(dueAtMs);
  const todayKey = dayKeyFromMs(now);
  const tomorrowKey = dayKeyFromMs(now + DAY);
  const yesterdayKey = dayKeyFromMs(now - DAY);

  let day: string;
  if (dueKey === todayKey) day = 'Bugün';
  else if (dueKey === tomorrowKey) day = 'Yarın';
  else if (dueKey === yesterdayKey) day = 'Dün';
  else day = formatShortDate(dueAtMs);

  if (!hasTime) return day;
  const d = new Date(dueAtMs);
  return `${day} · ${formatClock(d.getHours(), d.getMinutes())}`;
}
