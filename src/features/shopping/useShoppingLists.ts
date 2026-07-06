import type { ShoppingList } from '@/domain/types';
import { watchShoppingLists } from '@/services/firestore/shoppingLists';
import { useWatch } from '@/services/firestore/useWatch';

/** Hane alışveriş listelerini canlı dinler. `null` = yükleniyor / hane yok. */
export function useShoppingLists(householdId: string | null): ShoppingList[] | null {
  return useWatch(householdId, watchShoppingLists);
}
