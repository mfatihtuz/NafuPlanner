import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { buildWidgetSnapshot } from '@/domain/widget';
import { useShoppingLists } from '@/features/shopping/useShoppingLists';
import { useTasks } from '@/features/tasks/useTasks';
import { useAuth } from '@/services/auth/AuthProvider';
import { useHousehold } from '@/services/household/HouseholdProvider';
import { writeWidgetSnapshot } from '@/services/widgets/widgetSync';

/**
 * Görünmez yardımcı: hane görevleri değiştikçe iOS widget'ının "günüm" anlık
 * görüntüsünü günceller. Uygulama genelinde (sadece Bugün sekmesi değil) çalışsın
 * diye HouseholdProvider altında, kök app yerleşiminde mount edilir.
 *
 * iOS dışında ve native modül yokken writeWidgetSnapshot zaten no-op'tur.
 */
export function WidgetSync() {
  const { user } = useAuth();
  const { household } = useHousehold();
  const uid = user?.uid ?? null;
  const tasks = useTasks(household?.id ?? null);
  const lists = useShoppingLists(household?.id ?? null);
  // Aynı içerik için tekrar yazmayı (ve reload bütçesi harcamayı) önle.
  const lastStable = useRef<string | null>(null);

  useEffect(() => {
    if (tasks == null) return;
    const snapshot = buildWidgetSnapshot(tasks, lists ?? [], Date.now(), uid);
    // generatedAtMs her seferinde değişir; karşılaştırmadan onu çıkar.
    const stable = JSON.stringify({ ...snapshot, generatedAtMs: 0 });
    if (stable === lastStable.current) return;
    lastStable.current = stable;
    writeWidgetSnapshot(snapshot);
  }, [tasks, lists, uid]);

  // Arka plana geçerken son taze görüntüyü yaz (saat etiketleri / gün geçişi).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' && tasks != null) {
        writeWidgetSnapshot(buildWidgetSnapshot(tasks, lists ?? [], Date.now(), uid));
      }
    });
    return () => sub.remove();
  }, [tasks, lists, uid]);

  return null;
}
