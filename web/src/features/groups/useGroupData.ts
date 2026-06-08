import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GroupMember, InvitationCreated } from '@/types/api';

export function membersQueryKey(groupId: string | null) {
  return ['members', groupId] as const;
}

/** Grup uyelerini ceker (gorev atama ve uyeler listesi icin ortak). */
export function useMembers(groupId: string | null) {
  return useQuery<GroupMember[]>({
    queryKey: membersQueryKey(groupId),
    enabled: Boolean(groupId),
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) =>
      api.get<GroupMember[]>(`/groups/${groupId}/members`, { signal }),
  });
}

/** Davet baglantisi olusturur (paylasilabilir link doner). */
export function useCreateInvitation(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<InvitationCreated>(`/groups/${groupId}/invitations`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: membersQueryKey(groupId) });
    },
  });
}
