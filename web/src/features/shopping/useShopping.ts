import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ShoppingItem } from '@/types/api';

export function shoppingQueryKey(groupId: string | null) {
  return ['shopping', groupId] as const;
}

export function useShopping(groupId: string | null) {
  return useQuery<ShoppingItem[]>({
    queryKey: shoppingQueryKey(groupId),
    enabled: Boolean(groupId),
    queryFn: ({ signal }) =>
      api.get<ShoppingItem[]>(`/groups/${groupId}/shopping`, { signal }),
  });
}

/** Sepete alma/cikarma. Iyimser guncelleme ile aninda geri bildirim. */
export function useToggleShopping(groupId: string | null) {
  const queryClient = useQueryClient();
  const key = shoppingQueryKey(groupId);

  return useMutation({
    mutationFn: (item: ShoppingItem) =>
      api.post<ShoppingItem>(`/shopping/${item.id}/toggle`),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItem[]>(key);
      queryClient.setQueryData<ShoppingItem[]>(key, (list) =>
        (list ?? []).map((it) =>
          it.id === item.id ? { ...it, checked: !it.checked } : it,
        ),
      );
      return { previous };
    },
    onError: (_err, _item, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/** Yeni urun ekleme. */
export function useAddShopping(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<ShoppingItem>(`/groups/${groupId}/shopping`, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shoppingQueryKey(groupId) });
    },
  });
}
