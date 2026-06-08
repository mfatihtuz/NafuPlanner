import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Priority,
  Subtask,
  Task,
  TaskAttachment,
  TaskComment,
} from '@/types/api';

/** Tek bir gorevin tum ayrintilarini (alt adimlar, atananlar) ceken anahtar. */
export function taskQueryKey(taskId: string | null) {
  return ['task', taskId] as const;
}
export function commentsQueryKey(taskId: string | null) {
  return ['task-comments', taskId] as const;
}
export function attachmentsQueryKey(taskId: string | null) {
  return ['task-attachments', taskId] as const;
}

/** POST/PATCH /api/tasks govdesi. snake_case alanlar; undefined alanlar gonderilmez. */
export interface TaskInput {
  title: string;
  notes?: string | null;
  category_id?: string | null;
  priority?: Priority;
  due_at?: string | null;
  due_has_time?: boolean;
  assignee_ids?: string[];
  tags?: string[];
}

/** Tek gorev ayrintisi (detay sayfasi/sheet). */
export function useTask(taskId: string | null, options?: { enabled?: boolean }) {
  return useQuery<Task>({
    queryKey: taskQueryKey(taskId),
    enabled: Boolean(taskId) && (options?.enabled ?? true),
    queryFn: ({ signal }) => api.get<Task>(`/tasks/${taskId}`, { signal }),
  });
}

/** Yeni gorev olusturur, ardindan tum gorev listelerini tazeler. */
export function useCreateTask(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) =>
      api.post<Task>(`/groups/${groupId}/tasks`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['activity', groupId] });
    },
  });
}

/** Var olan gorevi gunceller; liste ve detayi tazeler. */
export function useUpdateTask(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: TaskInput & { id: string }) =>
      api.patch<Task>(`/tasks/${id}`, input),
    onSuccess: (task) => {
      queryClient.setQueryData(taskQueryKey(task.id), task);
      void queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['activity', groupId] });
    },
  });
}

/** Gorevi siler; listelerden cikarir. */
export function useDeleteTask(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/tasks/${id}`),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: taskQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['activity', groupId] });
    },
  });
}

// --- Alt adimlar ----------------------------------------------------------

/** Detaydaki gorev nesnesinin alt adim listesini yerel olarak gunceller. */
function patchDetailSubtasks(
  queryClient: ReturnType<typeof useQueryClient>,
  taskId: string,
  updater: (subtasks: Subtask[]) => Subtask[],
) {
  queryClient.setQueryData<Task>(taskQueryKey(taskId), (prev) =>
    prev ? { ...prev, subtasks: updater(prev.subtasks ?? []) } : prev,
  );
}

export function useAddSubtask(taskId: string, groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) =>
      api.post<Subtask>(`/tasks/${taskId}/subtasks`, { title }),
    onSuccess: (subtask) => {
      patchDetailSubtasks(queryClient, taskId, (list) => [...list, subtask]);
      void queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
    },
  });
}

/**
 * Alt adimi isaretle/kaldir. Iyimser: dokununca aninda doner; PATCH ile kalici.
 */
export function useToggleSubtask(taskId: string, groupId: string | null) {
  const queryClient = useQueryClient();
  const key = taskQueryKey(taskId);
  return useMutation({
    mutationFn: (subtask: Subtask) =>
      api.patch<Subtask>(`/subtasks/${subtask.id}`, { done: !subtask.done }),
    onMutate: async (subtask) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task>(key);
      patchDetailSubtasks(queryClient, taskId, (list) =>
        list.map((s) => (s.id === subtask.id ? { ...s, done: !s.done } : s)),
      );
      return { previous };
    },
    onError: (_err, _subtask, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
    },
  });
}

export function useDeleteSubtask(taskId: string, groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subtaskId: string) => api.del<void>(`/subtasks/${subtaskId}`),
    onMutate: async (subtaskId) => {
      const key = taskQueryKey(taskId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task>(key);
      patchDetailSubtasks(queryClient, taskId, (list) =>
        list.filter((s) => s.id !== subtaskId),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous)
        queryClient.setQueryData(taskQueryKey(taskId), context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
    },
  });
}

// --- Yorumlar -------------------------------------------------------------

export function useComments(taskId: string | null) {
  return useQuery<TaskComment[]>({
    queryKey: commentsQueryKey(taskId),
    enabled: Boolean(taskId),
    queryFn: ({ signal }) =>
      api.get<TaskComment[]>(`/tasks/${taskId}/comments`, { signal }),
  });
}

export function useAddComment(taskId: string, groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post<TaskComment>(`/tasks/${taskId}/comments`, { body }),
    onSuccess: (comment) => {
      queryClient.setQueryData<TaskComment[]>(
        commentsQueryKey(taskId),
        (list) => [...(list ?? []), comment],
      );
      void queryClient.invalidateQueries({ queryKey: ['tasks', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['activity', groupId] });
    },
  });
}

// --- Fotograf ekleri ------------------------------------------------------

/**
 * Gorev fotograf eklerini ceker. Detay yaniti ekleri gomulu donduruyorsa
 * (`task.attachments`) bu sorgu devre disi birakilip o veri kullanilabilir;
 * gomulu degilse ayri uctan cekilir.
 */
export function useAttachments(taskId: string | null, options?: { enabled?: boolean }) {
  return useQuery<TaskAttachment[]>({
    queryKey: attachmentsQueryKey(taskId),
    enabled: Boolean(taskId) && (options?.enabled ?? true),
    queryFn: ({ signal }) =>
      api.get<TaskAttachment[]>(`/tasks/${taskId}/attachments`, { signal }),
  });
}

export function useUploadAttachment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<TaskAttachment>(`/tasks/${taskId}/attachments`, form);
    },
    onSuccess: (attachment) => {
      queryClient.setQueryData<TaskAttachment[]>(
        attachmentsQueryKey(taskId),
        (list) => [...(list ?? []), attachment],
      );
      // Ekler detay yanitina gomuluyse onu da guncel tut.
      queryClient.setQueryData<Task>(taskQueryKey(taskId), (prev) =>
        prev && prev.attachments
          ? { ...prev, attachments: [...prev.attachments, attachment] }
          : prev,
      );
    },
  });
}

export function useDeleteAttachment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      api.del<void>(`/attachments/${attachmentId}`),
    onSuccess: (_data, attachmentId) => {
      queryClient.setQueryData<TaskAttachment[]>(
        attachmentsQueryKey(taskId),
        (list) => (list ?? []).filter((a) => a.id !== attachmentId),
      );
      queryClient.setQueryData<Task>(taskQueryKey(taskId), (prev) =>
        prev && prev.attachments
          ? { ...prev, attachments: prev.attachments.filter((a) => a.id !== attachmentId) }
          : prev,
      );
    },
  });
}
