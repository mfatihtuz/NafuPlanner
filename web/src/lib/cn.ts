import clsx, { type ClassValue } from 'clsx';

/** Kosullu sinif birlestirme yardimcisi (clsx ince sarmalayicisi). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
