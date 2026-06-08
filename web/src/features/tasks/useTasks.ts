import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCelebration } from '@/providers/CelebrationProvider';
import type { Task } from '@/types/api';

export type TaskScope = 'today' | 'all' | 'overdue' | 'upcoming';

interface UseTasksParams {
  groupId: string | null;
  scope: TaskScope;
  /** Sunucu tarafi kategori filtresi (kategori kimligi). */
  category?: string | null;
  /** Sunucu tarafi atanan filtresi (kullanici kimligi). */
  assignee?: string | null;
}

export function tasksQueryKey(
  groupId: string | null,
  scope: TaskScope,
  category?: string | null,
  assignee?: string | null,
) {
  return ['tasks', groupId, scope, category ?? null, assignee ?? null] as const;
}

/** Bir grubun belirli kapsamdaki (ve istege bagli filtreli) gorevlerini ceker. */
export function useTasks({ groupId, scope, category, assignee }: UseTasksParams) {
  return useQuery<Task[]>({
    queryKey: tasksQueryKey(groupId, scope, category, assignee),
    enabled: Boolean(groupId),
    queryFn: ({ signal }) =>
      api.get<Task[]>(`/groups/${groupId}/tasks`, {
        params: { scope, category: category ?? undefined, assignee: assignee ?? undefined },
        signal,
      }),
  });
}

/**
 * Gorevi tamamla/geri al. Iyimser guncelleme: dokununca aninda durum degisir,
 * hata olursa onceki durum geri yuklenir. Tum gorev sorgularini tazeler.
 * Acik bir detay sheet'i varsa onun onbellegi de iyimser guncellenir.
 */
export function useToggleTask(groupId: string | null) {
  const queryClient = useQueryClient();
  const { celebrate } = useCelebration();

  return useMutation({
    mutationFn: ({ task }: { task: Task }) => {
      const action = task.status === 'done' ? 'uncomplete' : 'complete';
      return api.post<Task>(`/tasks/${task.id}/${action}`);
    },
    onMutate: async ({ task }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', groupId] });
      const snapshots = queryClient.getQueriesData<Task[]>({
        queryKey: ['tasks', groupId],
      });
      const nextStatus = task.status === 'done' ? 'open' : 'done';
      for (const [key, list] of snapshots) {
        if (!list) continue;
        queryClient.setQueryData<Task[]>(
          key,
          list.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
        );
      }
      const detailKey = ['task', task.id] as const;
      const detailPrev = queryClient.getQueryData<Task>(detailKey);
      if (detailPrev) {
        queryClient.setQueryData<Task>(detailKey, { ...detailPrev, status: nextStatus });
      }
      return { snapshots, detailKey, detailPrev };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(([key, list]) => {
        queryClient.setQueryData(key, list);
      });
      if (context?.detailPrev) {
        queryClient.setQueryData(context.detailKey, context.detailPrev);
      }
    },
    onSuccess: (updated) => {
      // Sunucudan donen tamamlayan/zaman bilgisini detayda guncelle.
      queryClient.setQueryData(['task', updated.id], updated);
      // Tamamlama odulu varsa kutla (yalnizca yeni tamamlamada gelir).
      if (updated.reward) {
        celebrate(updated.reward);
      }
    },
    onSettled: (_data, _err, { task }) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      void queryClient.invalidateQueries({ queryKey: ['activity', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['leaderboard', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['badges', groupId] });
    },
  });
}
