import { isWithinQuietHours } from './time';
import type { ClockTime, Millis, Task, UserSettings } from './types';

/**
 * Yerel bildirim zamanlaması için saf kurallar: kademeli hatırlatma anları,
 * sessiz saat kaydırması ve günlük özet zamanı.
 */

/** İlk hatırlatmadan sonra "hâlâ bekliyor" dürtmesinin gecikmesi. */
export const ESCALATION_DELAY_MS = 30 * 60 * 1000;

function clockOf(ms: Millis): ClockTime {
  const d = new Date(ms);
  return { hour: d.getHours(), minute: d.getMinutes() };
}

/**
 * Verilen an sessiz saat aralığındaysa aralığın bitişine (quietHoursEnd)
 * kaydırır; değilse aynen döndürür. Gece yarısını aşan aralıkları destekler.
 */
export function shiftOutOfQuietHours(ms: Millis, settings?: UserSettings | null): Millis {
  const start = settings?.quietHoursStart;
  const end = settings?.quietHoursEnd;
  if (!start || !end) return ms;
  if (!isWithinQuietHours(clockOf(ms), start, end)) return ms;

  const at = new Date(ms);
  const shifted = new Date(
    at.getFullYear(),
    at.getMonth(),
    at.getDate(),
    end.hour,
    end.minute,
    0,
    0,
  );
  // Bitiş, başlangıçtan küçükse aralık gece yarısını aşıyor demektir;
  // gece tarafındaysak bitiş ertesi sabahtır.
  if (shifted.getTime() <= ms) shifted.setDate(shifted.getDate() + 1);
  return shifted.getTime();
}

/**
 * Bir görev için yerel hatırlatma anları: son tarih + 30 dk sonrası
 * (kademeli "hâlâ bekliyor"). Geçmiştekiler elenir, sessiz saat kaydırması
 * uygulanır, artan sırada ve tekilleştirilmiş döner.
 */
export function buildTaskReminderTimes(
  task: Pick<Task, 'status' | 'dueAtMs' | 'hasTime'>,
  settings: UserSettings | null | undefined,
  now: Millis,
): Millis[] {
  if (task.status !== 'open' && task.status !== 'in_progress') return [];
  if (!task.hasTime || task.dueAtMs == null) return [];

  const raw = [task.dueAtMs, task.dueAtMs + ESCALATION_DELAY_MS];
  const shifted = raw
    .map((ms) => shiftOutOfQuietHours(ms, settings))
    .filter((ms) => ms > now + 5_000);
  return [...new Set(shifted)].sort((a, b) => a - b);
}

/** Günlük özetin bir sonraki tetiklenme anı (bugünkü saat geçtiyse yarın). */
export function nextDailyDigestMs(settings: UserSettings | null | undefined, now: Millis): Millis | null {
  if (!settings?.dailyDigestEnabled) return null;
  const time = settings.dailyDigestTime ?? { hour: 8, minute: 0 };
  const d = new Date(now);
  const candidate = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    time.hour,
    time.minute,
    0,
    0,
  );
  if (candidate.getTime() <= now + 5_000) candidate.setDate(candidate.getDate() + 1);
  return candidate.getTime();
}

/** Günlük özet gövdesi: açık görev sayısı + ilk birkaç başlık. */
export function buildDigestBody(openTitles: string[]): string {
  if (openTitles.length === 0) {
    return 'Bugün için bekleyen görev yok. Keyfini çıkar! 🎉';
  }
  const head = openTitles.slice(0, 3).join(', ');
  const rest = openTitles.length > 3 ? ` ve ${openTitles.length - 3} görev daha` : '';
  return `Bugün ${openTitles.length} görev seni bekliyor: ${head}${rest}`;
}
