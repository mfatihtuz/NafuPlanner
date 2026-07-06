import { WEEKDAY_LABELS_TR } from './constants';
import { dayKeyFromDate } from './time';
import type { ClockTime, DayKey, Millis, RecurrenceRule } from './types';

/**
 * Tekrar kuralları için saf tarih hesapları. Sunucu gerektirmez: bir sonraki
 * örnek, istemcide deterministik olarak hesaplanır ve `{ruleId}_{dayKey}`
 * kimlikli görev olarak yazılır (iki cihaz aynı anda üretse de tek belge).
 */

const DAY_MS = 86_400_000;

function toDate(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDaysToKey(key: DayKey, days: number): DayKey {
  const date = toDate(key);
  date.setDate(date.getDate() + days);
  return dayKeyFromDate(date);
}

function diffDays(from: DayKey, to: DayKey): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS);
}

function maxKey(a: DayKey, b: DayKey): DayKey {
  return a >= b ? a : b;
}

/** Ayın istenen günü; ay kısa ise ayın son gününe kıstırılır. */
function monthlyCandidate(year: number, monthIndex: number, monthDay: number): DayKey {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return dayKeyFromDate(new Date(year, monthIndex, Math.min(monthDay, lastDay)));
}

/**
 * `after` gününden SONRAKİ ilk örnek günü döndürür (startDayKey'den önce
 * olamaz). Kural biterse (endDayKey aşıldıysa) null.
 */
export function nextOccurrenceDayKey(
  rule: Pick<
    RecurrenceRule,
    'frequency' | 'interval' | 'weekdays' | 'monthDay' | 'startDayKey' | 'endDayKey'
  >,
  after: DayKey,
): DayKey | null {
  const start = rule.startDayKey;
  let candidate: DayKey | null = null;

  switch (rule.frequency) {
    case 'daily': {
      candidate = maxKey(addDaysToKey(after, 1), start);
      break;
    }
    case 'interval': {
      const step = Math.max(1, rule.interval ?? 1);
      if (after < start) {
        candidate = start;
      } else {
        const passed = diffDays(start, after);
        const k = Math.floor(passed / step) + 1;
        candidate = addDaysToKey(start, k * step);
      }
      break;
    }
    case 'weekly': {
      const startWeekday = toDate(start).getDay();
      const weekdays =
        rule.weekdays && rule.weekdays.length > 0 ? rule.weekdays : [startWeekday];
      let cursor = maxKey(addDaysToKey(after, 1), start);
      for (let i = 0; i < 8; i++) {
        if (weekdays.includes(toDate(cursor).getDay())) {
          candidate = cursor;
          break;
        }
        cursor = addDaysToKey(cursor, 1);
      }
      break;
    }
    case 'monthly': {
      const monthDay = rule.monthDay ?? toDate(start).getDate();
      const from = maxKey(addDaysToKey(after, 1), start);
      const fromDate = toDate(from);
      for (let i = 0; i < 14; i++) {
        const c = monthlyCandidate(
          fromDate.getFullYear(),
          fromDate.getMonth() + i,
          monthDay,
        );
        if (c >= from) {
          candidate = c;
          break;
        }
      }
      break;
    }
  }

  if (!candidate) return null;
  if (rule.endDayKey && candidate > rule.endDayKey) return null;
  return candidate;
}

/** Örnek gününü son tarihe çevirir: saat verilmişse o saat, yoksa öğlen. */
export function occurrenceDueAt(
  dayKey: DayKey,
  time?: ClockTime,
): { dueAtMs: Millis; hasTime: boolean } {
  const [y, m, d] = dayKey.split('-').map(Number);
  if (time) {
    return {
      dueAtMs: new Date(y, (m ?? 1) - 1, d ?? 1, time.hour, time.minute).getTime(),
      hasTime: true,
    };
  }
  return { dueAtMs: new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0).getTime(), hasTime: false };
}

const WEEKDAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Pzt..Paz görüntüleme sırası

/** Kuralın kısa Türkçe açıklaması ("Her gün", "Her hafta: Pzt, Çar" …). */
export function describeRecurrenceTr(
  rule: Pick<RecurrenceRule, 'frequency' | 'interval' | 'weekdays' | 'monthDay'>,
): string {
  switch (rule.frequency) {
    case 'daily':
      return 'Her gün';
    case 'interval': {
      const n = Math.max(1, rule.interval ?? 1);
      return n === 1 ? 'Her gün' : `Her ${n} günde bir`;
    }
    case 'weekly': {
      const days = rule.weekdays ?? [];
      const weekdaySet = new Set(days);
      if (days.length === 0) return 'Her hafta';
      if (
        days.length === 5 &&
        [1, 2, 3, 4, 5].every((d) => weekdaySet.has(d))
      ) {
        return 'Hafta içi her gün';
      }
      const labels = WEEKDAYS_ORDER.filter((d) => weekdaySet.has(d)).map(
        (d) => WEEKDAY_LABELS_TR[d],
      );
      return `Her hafta: ${labels.join(', ')}`;
    }
    case 'monthly':
      return rule.monthDay ? `Her ayın ${rule.monthDay}. günü` : 'Her ay';
  }
}
