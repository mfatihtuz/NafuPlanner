import type { Invitation, Millis } from './types';

/**
 * Davet kodu kuralları. Kod, insan eliyle yazılabilir kısa bir anahtardır;
 * karışan karakterler (0/O, 1/I) alfabeye alınmaz.
 */
export const INVITE_CODE_LENGTH = 6;
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün

export type RandomInt = (maxExclusive: number) => number;

const defaultRandom: RandomInt = (max) => Math.floor(Math.random() * max);

/** 6 haneli, okunaklı davet kodu üretir. */
export function generateInviteCode(randomInt: RandomInt = defaultRandom): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

/** Kullanıcı girdisini koda dönüştürür (boşluk/küçük harf toleransı). */
export function normalizeInviteCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

export function isInviteUsable(invitation: Invitation, now: Millis): boolean {
  return invitation.status === 'pending' && now < invitation.expiresAtMs;
}
