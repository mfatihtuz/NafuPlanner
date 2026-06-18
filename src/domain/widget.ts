import { formatClock, formatDueLabel, formatShortDate } from './format';
import { shoppingListsDue } from './shopping';
import { groupTasks } from './tasks';
import { dayKeyFromMs } from './time';
import type { Millis, Priority, ShoppingList, Task } from './types';

/**
 * Kilit ekranı / ana ekran widget'ının okuduğu "günüm" anlık görüntüsü.
 *
 * Widget ayrı bir süreçte çalışır; Firebase/JS koşamaz. Bu yüzden uygulama,
 * görevler değiştikçe bugünün özetini App Group paylaşımlı alanına JSON olarak
 * yazar; widget yalnız bunu okur. Bu modül o JSON'u üreten SAF mantıktır
 * (Swift tarafı birebir bu şemayı çözer). Şema sade ve Codable dostu tutulur.
 */

export interface WidgetTaskItem {
  id: string;
  /** Görev mi alışveriş listesi mi (widget farklı simge çizer). */
  kind: 'task' | 'shopping';
  title: string;
  /** Saatli öğede "14:30"; gecikende gün etiketi ("Dün"); yoksa "". */
  timeLabel: string;
  /** Görev önceliği (renk noktası için); alışverişte yok sayılır. */
  priority: Priority;
  overdue: boolean;
}

export interface WidgetSnapshot {
  /** Üretim zamanı (ms) — widget "ne kadar güncel" bilgisini gösterebilir. */
  generatedAtMs: Millis;
  /** Bugünün tarihi, ör. "12 Haziran". */
  dateLabel: string;
  /** Bugünün gün adı, ör. "Perşembe". */
  weekdayLabel: string;
  /** Bugüne planlı (her durumda) görev sayısı. */
  todayTotal: number;
  /** Bugüne planlı ve tamamlanmış görev sayısı (ilerleme halkası için). */
  todayDone: number;
  /** Açık (tamamlanmamış) geciken görev sayısı. */
  overdueOpen: number;
  /** Gösterilecek eylem listesi: önce geciken, sonra bugün (kapaklı). */
  items: WidgetTaskItem[];
}

/** Widget'ta gösterilecek azami satır (boyut + serileştirme sınırı için). */
export const WIDGET_MAX_ITEMS = 10;

/** Pazar=0 … Cumartesi=6 için tam Türkçe gün adları. */
const WEEKDAY_NAMES_TR = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
] as const;

function timeLabelForDue(
  due: { dueAtMs?: Millis; hasTime?: boolean },
  now: Millis,
): string {
  if (due.dueAtMs == null) return '';
  if (dayKeyFromMs(due.dueAtMs) < dayKeyFromMs(now)) {
    return formatDueLabel(due.dueAtMs, due.hasTime ?? false, now);
  }
  if (!due.hasTime) return '';
  const d = new Date(due.dueAtMs);
  return formatClock(d.getHours(), d.getMinutes());
}

/**
 * Bugünün widget özetini üretir (kullanıcı `uid` perspektifinden).
 *
 * Eylem listesi Bugün ekranıyla aynı kümedir: açık geciken + açık bugün
 * görevleri VE bugünkü alışveriş listeleri (tarihli ya da bana ait/atanmış
 * tarihsiz). Her bölümde önce görevler, sonra listeler. İlerleme halkası
 * bugünün açık + tamamlanmış işlerinin oranını yansıtır.
 */
export function buildWidgetSnapshot(
  tasks: Task[],
  lists: ShoppingList[],
  now: Millis,
  uid: string | null,
): WidgetSnapshot {
  const todayKey = dayKeyFromMs(now);
  const sections = groupTasks(tasks, now);
  const shopping = shoppingListsDue(lists, now, uid);

  // Bugüne planlı (tarihli) ve tamamlanmış öğeler — ilerleme paydası için.
  const doneTodayTasks = tasks.filter(
    (task) =>
      task.status === 'done' &&
      task.dueAtMs != null &&
      dayKeyFromMs(task.dueAtMs) === todayKey,
  ).length;
  const doneTodayLists = lists.filter(
    (list) =>
      list.status === 'done' &&
      list.dueAtMs != null &&
      dayKeyFromMs(list.dueAtMs) === todayKey,
  ).length;

  const taskItem = (task: Task): WidgetTaskItem => ({
    id: task.id,
    kind: 'task',
    title: task.title,
    timeLabel: timeLabelForDue(task, now),
    priority: task.priority,
    overdue: task.dueAtMs != null && dayKeyFromMs(task.dueAtMs) < todayKey,
  });
  const shopItem = (list: ShoppingList): WidgetTaskItem => ({
    id: `shop:${list.id}`,
    kind: 'shopping',
    title: list.name,
    timeLabel: timeLabelForDue(list, now),
    priority: 'medium',
    overdue: list.dueAtMs != null && dayKeyFromMs(list.dueAtMs) < todayKey,
  });

  const items: WidgetTaskItem[] = [
    ...sections.overdue.map(taskItem),
    ...shopping.overdue.map(shopItem),
    ...sections.today.map(taskItem),
    ...shopping.today.map(shopItem),
  ].slice(0, WIDGET_MAX_ITEMS);

  const todayOpen = sections.today.length + shopping.today.length;
  const todayDone = doneTodayTasks + doneTodayLists;

  return {
    generatedAtMs: now,
    dateLabel: formatShortDate(now),
    weekdayLabel: WEEKDAY_NAMES_TR[new Date(now).getDay()],
    // total = bugünün açık + tamamlanmış işleri (ilerleme halkası tutarlı kalsın).
    todayTotal: todayOpen + todayDone,
    todayDone,
    overdueOpen: sections.overdue.length + shopping.overdue.length,
    items,
  };
}
