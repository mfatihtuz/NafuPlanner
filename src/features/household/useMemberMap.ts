import { useMemo } from 'react';

import type { Member } from '@/domain/types';

/** Üyeleri userId → Member haritasına çevirir (birçok ekranda ortak). */
export function useMemberMap(members: Member[]): Map<string, Member> {
  return useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);
}
