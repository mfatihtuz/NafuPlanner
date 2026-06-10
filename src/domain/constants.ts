import { colors } from '@/ui/theme/colors';

import type { Priority } from './types';

/** Önceliklerin görsel/sayısal meta verisi. */
export const PRIORITY_META: Record<
  Priority,
  { labelTr: string; color: string; weight: number }
> = {
  low: { labelTr: 'Düşük', color: colors.priorityLow, weight: 1 },
  medium: { labelTr: 'Orta', color: colors.priorityMedium, weight: 2 },
  high: { labelTr: 'Yüksek', color: colors.priorityHigh, weight: 3 },
  urgent: { labelTr: 'Acil', color: colors.priorityUrgent, weight: 4 },
};

/** Önceliğe göre bir görevi tamamlayınca kazanılan temel puan. */
export const POINTS_BY_PRIORITY: Record<Priority, number> = {
  low: 5,
  medium: 10,
  high: 15,
  urgent: 20,
};

/** Her seviye için gereken puan aralığı. */
export const POINTS_PER_LEVEL = 100;

/** Yeni bir hane oluşturulurken eklenen varsayılan Türkçe kategoriler. */
export const DEFAULT_CATEGORIES: readonly {
  slug: string;
  name: string;
  color: string;
  icon: string;
}[] = [
  { slug: 'genel', name: 'Genel', color: colors.primary, icon: 'tag' },
  { slug: 'ev-isleri', name: 'Ev İşleri', color: colors.primaryDark, icon: 'home' },
  { slug: 'mutfak', name: 'Mutfak', color: colors.accent, icon: 'utensils' },
  { slug: 'temizlik', name: 'Temizlik', color: colors.primaryLight, icon: 'sparkles' },
  { slug: 'alisveris', name: 'Alışveriş', color: colors.reward, icon: 'cart' },
  { slug: 'faturalar', name: 'Faturalar', color: colors.danger, icon: 'receipt' },
  { slug: 'saglik', name: 'Sağlık', color: colors.success, icon: 'heart' },
];

export const WEEKDAY_LABELS_TR = [
  'Paz',
  'Pzt',
  'Sal',
  'Çar',
  'Per',
  'Cum',
  'Cmt',
] as const;

/** Takvim başlığı için Pazartesi ile başlayan kısa gün adları. */
export const CALENDAR_WEEKDAYS_TR = [
  'Pzt',
  'Sal',
  'Çar',
  'Per',
  'Cum',
  'Cmt',
  'Paz',
] as const;

export const MONTHS_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const;
