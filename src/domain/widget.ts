import { formatClock, formatDueLabel, formatShortDate } from './format';
import { groupTasks } from './tasks';
import { dayKeyFromMs } from './time';
import type { Millis, Priority, Task } from './types';

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
  title: string;
  /** Saatli görevde "14:30"; geciken görevde gün etiketi ("Dün"); yoksa "". */
  timeLabel: string;
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

function timeLabelFor(task: Task, now: Millis): string {
  if (task.dueAtMs == null) return '';
  const isOverdue = dayKeyFromMs(task.dueAtMs) < dayKeyFromMs(now);
  if (isOverdue) return formatDueLabel(task.dueAtMs, task.hasTime, now);
  if (!task.hasTime) return '';
  const d = new Date(task.dueAtMs);
  return formatClock(d.getHours(), d.getMinutes());
}

/**
 * Görevlerden bugünün widget özetini üretir.
 *
 * Eylem listesi Bugün ekranıyla aynı kümedir: açık geciken + açık bugün
 * görevleri (groupTasks ile aynı sıralama). İlerleme halkası ise bugüne planlı
 * tüm görevlerin (tamamlanan dahil) tamamlanma oranını yansıtır.
 */
export function buildWidgetSnapshot(tasks: Task[], now: Millis): WidgetSnapshot {
  const todayKey = dayKeyFromMs(now);
  const sections = groupTasks(tasks, now);

  const dueToday = tasks.filter(
    (task) =>
      task.status !== 'archived' &&
      task.dueAtMs != null &&
      dayKeyFromMs(task.dueAtMs) === todayKey,
  );

  const items: WidgetTaskItem[] = [...sections.overdue, ...sections.today]
    .slice(0, WIDGET_MAX_ITEMS)
    .map((task) => ({
      id: task.id,
      title: task.title,
      timeLabel: timeLabelFor(task, now),
      priority: task.priority,
      overdue: task.dueAtMs != null && dayKeyFromMs(task.dueAtMs) < todayKey,
    }));

  return {
    generatedAtMs: now,
    dateLabel: formatShortDate(now),
    weekdayLabel: WEEKDAY_NAMES_TR[new Date(now).getDay()],
    todayTotal: dueToday.length,
    todayDone: dueToday.filter((task) => task.status === 'done').length,
    overdueOpen: sections.overdue.length,
    items,
  };
}
