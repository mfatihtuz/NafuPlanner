import type { Category } from '@/domain/types';
import { watchCategories } from '@/services/firestore/categories';
import { useWatch } from '@/services/firestore/useWatch';

/** Hane kategorilerini canlı dinler. `null` = yükleniyor / hane yok. */
export function useCategories(householdId: string | null): Category[] | null {
  return useWatch(householdId, watchCategories);
}
