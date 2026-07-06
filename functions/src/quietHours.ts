/**
 * Sessiz saat yardımcıları (sunucu tarafı). Alıcının yerel saatini hesaplamak
 * için üyelik belgesindeki `utcOffsetMinutes` kullanılır (cihaz kaydeder).
 * Yoksa UTC varsayılır.
 */
export interface Clock {
  hour: number;
  minute: number;
}

const minutesOf = (c: Clock) => c.hour * 60 + c.minute;

/** Verilen yerel saat, sessiz aralıkta mı (gece yarısını aşabilir)? */
export function withinQuietHours(at: Clock, start?: Clock | null, end?: Clock | null): boolean {
  if (!start || !end) return false;
  const a = minutesOf(at);
  const s = minutesOf(start);
  const e = minutesOf(end);
  if (s === e) return false;
  return s < e ? a >= s && a < e : a >= s || a < e;
}

/** Sunucu (UTC) ms → alıcının yerel saati (ofset dakika). */
export function localClock(nowMs: number, offsetMin: number): Clock {
  const d = new Date(nowMs + offsetMin * 60_000);
  return { hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

/** Sessiz aralığın bitişine (alıcının yerelinde) denk gelen sunucu (UTC) ms. */
export function nextQuietEndMs(nowMs: number, offsetMin: number, end: Clock): number {
  const localNow = nowMs + offsetMin * 60_000;
  const d = new Date(localNow);
  let endLocal = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), end.hour, end.minute);
  if (endLocal <= localNow) endLocal += 86_400_000; // bugün geçtiyse yarın
  return endLocal - offsetMin * 60_000;
}
