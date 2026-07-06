import type { Task } from '@/domain/types';
import { watchTasks } from '@/services/firestore/tasks';
import { useWatch } from '@/services/firestore/useWatch';

/** Hane görevlerini canlı dinler. `null` = yükleniyor / hane yok. */
export function useTasks(householdId: string | null): Task[] | null {
  return useWatch(householdId, watchTasks);
}
