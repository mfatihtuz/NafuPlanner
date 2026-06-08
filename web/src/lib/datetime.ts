// Tarih/saat yardimcilari. Sunucu ISO-8601 UTC gonderir ('Z' ekli); burada
// yerel saate cevrilir. iOS Safari, '2026-06-08T19:00:00Z' bicimini sorunsuz
// cozer; ancak bazi uclar tarihi bosluklu ('YYYY-MM-DD HH:MM:SS') donebilir.
// parseIso bu durumu da guvenle ele alir.
import { tr } from '@/i18n/tr';

/**
 * ISO-8601 dizesini Date'e cevirir. iOS Safari uyumlu:
 *  - bosluklu tarihleri ('YYYY-MM-DD HH:MM:SS') 'T' ile birlestirir
 *  - zaman dilimi belirtilmemis tam zaman damgalarini UTC ('Z') kabul eder
 *  - yalnizca tarih ('YYYY-MM-DD') ise yerel gun basi olur
 * Gecersiz girdide null doner.
 */
export function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;

  // Yalnizca tarih: yerel gun basi (UTC kaymasi olmadan).
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  let normalized = value.trim().replace(' ', 'T');
  // Zaman dilimi eki yoksa UTC varsay (sozlesme geregi sunucu UTC gonderir).
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized);
  if (!hasZone) normalized += 'Z';

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * ISO UTC zaman damgasini, `<input type="date">` ve `<input type="time">` icin
 * yerel saate gore parcalara ayirir. due_at yoksa bos parcalar doner.
 */
export function isoToLocalParts(iso: string | null): { date: string; time: string } {
  const d = parseIso(iso);
  if (!d) return { date: '', time: '' };
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return { date, time };
}

/**
 * Yerel `date` (YYYY-MM-DD) ve istege bagli `time` (HH:MM) degerlerini ISO UTC
 * dizesine cevirir. Saat yoksa gunun baslangici (00:00 yerel) alinir; cagiran
 * taraf due_has_time bilgisini ayrica tasir. Tarih bos ise null doner.
 */
export function localPartsToIso(date: string, time: string | null): string | null {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return null;
  let hours = 0;
  let minutes = 0;
  if (time) {
    const [hh, mm] = time.split(':').map(Number);
    hours = Number.isFinite(hh) ? hh : 0;
    minutes = Number.isFinite(mm) ? mm : 0;
  }
  const local = new Date(y, m - 1, d, hours, minutes, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

/** Gunun saatine gore selam metni (tr.today selamlari ile uyumlu). */
export function greetingForHour(hour: number = new Date().getHours()): string {
  if (hour >= 5 && hour < 12) return tr.today.greetingMorning;
  if (hour >= 12 && hour < 18) return tr.today.greetingAfternoon;
  if (hour >= 18 && hour < 23) return tr.today.greetingEvening;
  return tr.today.greetingNight;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Bir ISO tarihinin bugune gore gun farki (0=bugun, -1=dun, 1=yarin). */
export function dayDelta(iso: string, now: Date = new Date()): number {
  const target = parseIso(iso);
  if (!target) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfDay(target).getTime() - startOfDay(now).getTime()) / msPerDay,
  );
}

export function isOverdue(iso: string | null, now: Date = new Date()): boolean {
  const target = parseIso(iso);
  if (!target) return false;
  return target.getTime() < now.getTime();
}

/** Saati "HH:MM" olarak yerel bicimde dondurur. */
export function formatTime(iso: string): string {
  const d = parseIso(iso);
  if (!d) return '';
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/** Kisa tarih: "8 Haziran" (ayni yil) ya da "8 Haz 2025" (farkli yil). */
export function formatShortDate(iso: string, now: Date = new Date()): string {
  const d = parseIso(iso);
  if (!d) return '';
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: sameYear ? 'long' : 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** Kisa tarih + saat: "8 Haziran 14:30". */
export function formatDateTime(iso: string): string {
  const d = parseIso(iso);
  if (!d) return '';
  return `${formatShortDate(iso)} ${formatTime(iso)}`;
}

/**
 * Goreve uygun, sicak bir bitis zamani etiketi uretir.
 * Saat bilgisi yoksa yalnizca gun, varsa gun + saat gosterir.
 */
export function formatDueLabel(iso: string | null, hasTime: boolean): string | null {
  if (!iso) return null;
  const d = parseIso(iso);
  if (!d) return null;
  const delta = dayDelta(iso);
  const time = hasTime ? ` ${formatTime(iso)}` : '';

  let day: string;
  if (delta === 0) day = tr.common.today;
  else if (delta === -1) day = tr.common.yesterday;
  else if (delta === 1) day = tr.common.tomorrow;
  else day = formatShortDate(iso);
  return `${day}${time}`;
}

/**
 * Goreceli zaman (Turkce): "az once", "5 dakika once", "2 saat once",
 * "dun", "3 gun once", "2 hafta once"... Gelecek zamanlar icin "az sonra"
 * gibi karsiliklar uretir. Aktivite akisi ve yorumlarda kullanilir.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const d = parseIso(iso);
  if (!d) return '';
  const diffMs = now.getTime() - d.getTime();
  const past = diffMs >= 0;
  const abs = Math.abs(diffMs);

  const sec = Math.round(abs / 1000);
  const min = Math.round(abs / 60_000);
  const hour = Math.round(abs / 3_600_000);
  const day = Math.round(abs / 86_400_000);
  const week = Math.round(abs / 604_800_000);

  const t = tr.time;
  if (sec < 45) return t.justNow;
  if (min < 60) return past ? t.minutesAgo(min) : t.inMinutes(min);
  if (hour < 24) return past ? t.hoursAgo(hour) : t.inHours(hour);
  if (day === 1) return past ? t.yesterday : t.tomorrow;
  if (day < 7) return past ? t.daysAgo(day) : t.inDays(day);
  if (week < 5) return past ? t.weeksAgo(week) : t.inWeeks(week);
  // Daha eski: kisa tarih.
  return formatShortDate(iso, now);
}
