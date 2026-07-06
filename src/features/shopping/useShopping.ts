import type { ShoppingItem } from '@/domain/types';
import { watchShopping } from '@/services/firestore/shopping';
import { useWatch } from '@/services/firestore/useWatch';

/** Alışveriş listesini canlı dinler. `null` = yükleniyor / hane yok. */
export function useShopping(householdId: string | null): ShoppingItem[] | null {
  return useWatch(householdId, watchShopping);
}
