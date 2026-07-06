import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  generateInviteCode,
  isInviteUsable,
  normalizeInviteCode,
} from '../invites';
import type { Invitation } from '../types';

describe('invites', () => {
  it('alfabeden, doğru uzunlukta kod üretir', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    for (const ch of code) {
      expect(INVITE_CODE_ALPHABET).toContain(ch);
    }
  });

  it('deterministik rng ile beklenen kodu üretir', () => {
    const code = generateInviteCode(() => 0);
    expect(code).toBe('AAAAAA');
  });

  it('girdiyi normalize eder', () => {
    expect(normalizeInviteCode('  ab 2c3d ')).toBe('AB2C3D');
  });

  it('geçerlilik kontrolü yapar', () => {
    const base: Invitation = {
      token: 'ABC234',
      householdId: 'h1',
      createdBy: 'u1',
      createdAtMs: 0,
      expiresAtMs: 1000,
      status: 'pending',
    };
    expect(isInviteUsable(base, 500)).toBe(true);
    expect(isInviteUsable(base, 1000)).toBe(false);
    expect(isInviteUsable({ ...base, status: 'revoked' }, 500)).toBe(false);
  });
});
