import { POINTS_BY_PRIORITY, POINTS_PER_LEVEL } from './constants';
import type { Priority } from './types';

/**
 * Saf oyunlaştırma kuralları — yan etkisiz, kolayca test edilebilir.
 */

/** Bir görevi tamamlayınca kazanılan puan. */
export function pointsForTask(priority: Priority): number {
  return POINTS_BY_PRIORITY[priority];
}

/** Toplam puandan seviye (1 tabanlı). */
export function levelForPoints(points: number): number {
  if (points <= 0) return 1;
  return Math.floor(points / POINTS_PER_LEVEL) + 1;
}

/** İçinde bulunulan seviyedeki ilerleme (0..1). */
export function levelProgress(points: number): number {
  const into = ((points % POINTS_PER_LEVEL) + POINTS_PER_LEVEL) % POINTS_PER_LEVEL;
  return into / POINTS_PER_LEVEL;
}

/** Bir sonraki seviyeye kalan puan. */
export function pointsToNextLevel(points: number): number {
  const current = levelForPoints(points);
  return current * POINTS_PER_LEVEL - points;
}
