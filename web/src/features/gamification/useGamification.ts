import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Badge, LeaderboardRow } from '@/types/api';

export function leaderboardQueryKey(groupId: string | null) {
  return ['leaderboard', groupId] as const;
}
export function badgesQueryKey(groupId: string | null) {
  return ['badges', groupId] as const;
}

/** Grubun katki tablosu (puan/seri/seviye/rozet sayisi). */
export function useLeaderboard(groupId: string | null) {
  return useQuery<LeaderboardRow[]>({
    queryKey: leaderboardQueryKey(groupId),
    enabled: Boolean(groupId),
    staleTime: 30_000,
    queryFn: ({ signal }) =>
      api.get<LeaderboardRow[]>(`/groups/${groupId}/leaderboard`, { signal }),
  });
}

/** Rozet katalogu + cagiran uyenin kazanim/ilerleme durumu. */
export function useBadges(groupId: string | null) {
  return useQuery<Badge[]>({
    queryKey: badgesQueryKey(groupId),
    enabled: Boolean(groupId),
    staleTime: 30_000,
    queryFn: ({ signal }) =>
      api.get<Badge[]>(`/groups/${groupId}/badges`, { signal }),
  });
}
