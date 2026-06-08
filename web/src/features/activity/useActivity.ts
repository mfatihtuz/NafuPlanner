import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Activity } from '@/types/api';

/**
 * Grup aktivite akisini sayfali ceker. Sayfalama `before` imleci ile yapilir:
 * son ogenin id degeri bir sonraki sayfa icin gonderilir (sunucu id'den kucuk,
 * yani daha eski kayitlari doner). Bir sayfa bos donerse sona ulasilmis sayilir.
 */
export function useActivity(groupId: string | null) {
  return useInfiniteQuery<Activity[]>({
    queryKey: ['activity', groupId],
    enabled: Boolean(groupId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api.get<Activity[]>(`/groups/${groupId}/activity`, {
        params: { before: pageParam as string | undefined },
        signal,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.length === 0 ? undefined : lastPage[lastPage.length - 1]?.id,
  });
}
