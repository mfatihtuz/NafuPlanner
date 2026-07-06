import type { Task } from './types';

/**
 * Görevleri başlık veya açıklamada geçen metne göre süzer. Türkçe büyük/küçük
 * harf duyarsızlığı için `toLocaleLowerCase('tr')` (İ/ı doğru eşleşsin).
 */
export function filterTasksByQuery(tasks: Task[], query: string): Task[] {
  const q = query.trim().toLocaleLowerCase('tr');
  if (!q) return tasks;
  return tasks.filter(
    (task) =>
      task.title.toLocaleLowerCase('tr').includes(q) ||
      (task.description?.toLocaleLowerCase('tr').includes(q) ?? false),
  );
}
