import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ShoppingItem } from '@/types/api';

export function shoppingQueryKey(groupId: string | null) {
  return ['shopping', groupId] as const;
}

/**
 * Alisveris listesi. Ortak liste oldugu icin odakta ve kisa araliklarla
 * yeniden cekilir; boylece "digeri aninda gorur" hissi olusur.
 */
export function useShopping(groupId: string | null) {
  return useQuery<ShoppingItem[]>({
    queryKey: shoppingQueryKey(groupId),
    enabled: Boolean(groupId),
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      // Yalnizca veri varken (sayfa acikken) periyodik tazele.
      query.state.data ? 20_000 : false,
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

export interface ShoppingInput {
  name: string;
  quantity?: string | null;
}

/** Yeni urun ekleme (ad + istege bagli miktar). */
export function useAddShopping(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ShoppingInput) =>
      api.post<ShoppingItem>(`/groups/${groupId}/shopping`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shoppingQueryKey(groupId) });
    },
  });
}

/** Tek urunu siler. Iyimser: aninda listeden cikar. */
export function useDeleteShopping(groupId: string | null) {
  const queryClient = useQueryClient();
  const key = shoppingQueryKey(groupId);
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/shopping/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItem[]>(key);
      queryClient.setQueryData<ShoppingItem[]>(key, (list) =>
        (list ?? []).filter((it) => it.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Sepetteki (isaretli) urunleri toplu siler. Sunucuda toplu uc olmadigi icin
 * istemci tek tek siler; ardindan liste tazelenir.
 */
export function useClearCheckedShopping(groupId: string | null) {
  const queryClient = useQueryClient();
  const key = shoppingQueryKey(groupId);
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.del<void>(`/shopping/${id}`)));
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItem[]>(key);
      const removing = new Set(ids);
      queryClient.setQueryData<ShoppingItem[]>(key, (list) =>
        (list ?? []).filter((it) => !removing.has(it.id)),
      );
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
