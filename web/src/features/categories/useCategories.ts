import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Category } from '@/types/api';

export function categoriesQueryKey(groupId: string | null) {
  return ['categories', groupId] as const;
}

/** Bir grubun kategorilerini ceker. Gorev formunda da kullanilir. */
export function useCategories(groupId: string | null) {
  return useQuery<Category[]>({
    queryKey: categoriesQueryKey(groupId),
    enabled: Boolean(groupId),
    // Kategoriler nadiren degisir; biraz daha taze tutmak gereksiz cagriyi onler.
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) =>
      api.get<Category[]>(`/groups/${groupId}/categories`, { signal }),
  });
}

export interface CategoryInput {
  name: string;
  color: string;
  icon: string;
}

/** Yeni kategori olusturur. */
export function useCreateCategory(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      api.post<Category>(`/groups/${groupId}/categories`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKey(groupId) });
    },
  });
}

/** Var olan kategoriyi gunceller (ad/renk/ikon). */
export function useUpdateCategory(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CategoryInput & { id: string }) =>
      api.patch<Category>(`/categories/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKey(groupId) });
    },
  });
}

/** Kategoriyi siler. Bagli gorevler sunucuda kategorisiz birakilir. */
export function useDeleteCategory(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/categories/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKey(groupId) });
      // Gorevler kategori rozetini gosterir; tazele.
      void queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
    },
  });
}
