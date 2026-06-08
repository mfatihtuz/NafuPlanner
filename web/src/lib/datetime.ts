// Tarih/saat yardimcilari. Sunucu ISO-8601 UTC gonderir; burada yerel saate cevrilir.
import { tr } from '@/i18n/tr';

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
  const target = startOfDay(new Date(iso));
  const today = startOfDay(now);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - today.getTime()) / msPerDay);
}

export function isOverdue(iso: string | null, now: Date = new Date()): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < now.getTime();
}

/** Saati "HH:MM" olarak yerel bicimde dondurur. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Goreve uygun, sicak bir bitis zamani etiketi uretir.
 * Saat bilgisi yoksa yalnizca gun, varsa gun + saat gosterir.
 */
export function formatDueLabel(iso: string | null, hasTime: boolean): string | null {
  if (!iso) return null;
  const delta = dayDelta(iso);
  const time = hasTime ? ` ${formatTime(iso)}` : '';

  let day: string;
  if (delta === 0) day = tr.common.today;
  else if (delta === -1) day = tr.common.yesterday;
  else if (delta === 1) day = tr.common.tomorrow;
  else {
    day = new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
    });
  }
  return `${day}${time}`;
}
