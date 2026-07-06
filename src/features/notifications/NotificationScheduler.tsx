import { useShoppingLists } from '@/features/shopping/useShoppingLists';
import { useTasks } from '@/features/tasks/useTasks';
import { useAuth } from '@/services/auth/AuthProvider';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { useNotificationScheduler } from '@/services/notifications/useNotificationScheduler';

/**
 * Görünmez yardımcı: yerel bildirim takvimini uygulama genelinde kurar. Önceden
 * yalnız "Bugün" sekmesi mount'luyken çalışıyordu; kök app yerleşiminde mount
 * edilince hangi sekmede olursak olalım hatırlatmalar güncel kalır. (Firestore
 * aynı sorguya tek ağ dinleyicisi açtığından ek maliyet yok.)
 */
export function NotificationScheduler() {
  const { user } = useAuth();
  const { household, profile, myMember } = useHousehold();
  const tasks = useTasks(household?.id ?? null);
  const lists = useShoppingLists(household?.id ?? null);

  useNotificationScheduler(
    tasks,
    profile?.settings,
    user?.uid ?? null,
    myMember
      ? { count: myMember.streakCount, lastActiveDayKey: myMember.lastActiveDayKey }
      : undefined,
    lists,
  );

  return null;
}
