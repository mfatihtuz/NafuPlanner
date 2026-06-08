import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Task } from '@/types/api';

export type TaskScope = 'today' | 'all' | 'overdue' | 'upcoming';

interface UseTasksParams {
  groupId: string | null;
  scope: TaskScope;
}

export function tasksQueryKey(groupId: string | null, scope: TaskScope) {
  return ['tasks', groupId, scope] as const;
}

/** Bir grubun belirli kapsamdaki gorevlerini ceker. */
export function useTasks({ groupId, scope }: UseTasksParams) {
  return useQuery<Task[]>({
    queryKey: tasksQueryKey(groupId, scope),
    enabled: Boolean(groupId),
    queryFn: ({ signal }) =>
      api.get<Task[]>(`/groups/${groupId}/tasks`, { params: { scope }, signal }),
  });
}

/**
 * Gorevi tamamla/geri al. Iyimser guncelleme: dokununca aninda durum degisir,
 * hata olursa onceki durum geri yuklenir. Tum gorev sorgularini tazeler.
 */
export function useToggleTask(groupId: string | null) {
  const queryClient = useQueryClient();

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
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(([key, list]) => {
        queryClient.setQueryData(key, list);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
    },
  });
}
