// Kategori (ve grup) gorseli: renk anahtari + Lucide ikon adi.
// Tum ikon kumesini paketlemek yerine kurat edilmis bir kayit tutariz; boylece
// hem secici sade kalir hem paket boyutu sismez. Bilinmeyen ad icin yedek ikon.
import type { LucideIcon } from 'lucide-react';
import {
  Tag,
  House,
  ShoppingCart,
  Utensils,
  Sparkles,
  Heart,
  Briefcase,
  Dog,
  Baby,
  Wrench,
  Leaf,
  Car,
  DollarSign,
  BookOpen,
  Dumbbell,
  Plane,
  Gift,
  Brush,
  Bath,
  Bed,
  Coffee,
  Trash2,
  Shirt,
  Flower2,
  Stethoscope,
} from 'lucide-react';

/** Secilebilir kategori ikonlari (Lucide ad -> bilesen). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Tag,
  House,
  ShoppingCart,
  Utensils,
  Sparkles,
  Heart,
  Briefcase,
  Dog,
  Baby,
  Wrench,
  Leaf,
  Car,
  DollarSign,
  BookOpen,
  Dumbbell,
  Plane,
  Gift,
  Brush,
  Bath,
  Bed,
  Coffee,
  Trash2,
  Shirt,
  Flower2,
  Stethoscope,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);
export const DEFAULT_CATEGORY_ICON = 'Tag';

/** Verilen ada karsilik gelen ikonu (yoksa yedek Tag) dondurur. */
export function categoryIcon(name: string | null | undefined): LucideIcon {
  if (name && CATEGORY_ICONS[name]) return CATEGORY_ICONS[name];
  return Tag;
}

/**
 * Kategori renk paleti. Anahtarlar API'de saklanir; her biri icin yumusak bir
 * arka plan + okunabilir on plan rengi tanimlanir (acik/koyu temada calisir).
 */
export interface CategoryColor {
  key: string;
  /** Nokta/ikon dolgusu (canli). */
  dot: string;
  /** Yumusak zemin (chip arka plani). */
  soft: string;
  /** Zemin uzerinde okunabilir metin/ikon. */
  on: string;
}

export const CATEGORY_COLORS: CategoryColor[] = [
  { key: 'teal', dot: '#44a1a0', soft: 'rgba(68,161,160,0.14)', on: '#247b7b' },
  { key: 'aqua', dot: '#46bbc8', soft: 'rgba(70,187,200,0.16)', on: '#1f6068' },
  { key: 'sky', dot: '#3b82f6', soft: 'rgba(59,130,246,0.14)', on: '#2563eb' },
  { key: 'indigo', dot: '#6366f1', soft: 'rgba(99,102,241,0.14)', on: '#4f46e5' },
  { key: 'violet', dot: '#8b5cf6', soft: 'rgba(139,92,246,0.14)', on: '#7c3aed' },
  { key: 'rose', dot: '#f43f5e', soft: 'rgba(244,63,94,0.13)', on: '#e11d48' },
  { key: 'amber', dot: '#f59e0b', soft: 'rgba(245,158,11,0.16)', on: '#b45309' },
  { key: 'lime', dot: '#84cc16', soft: 'rgba(132,204,22,0.16)', on: '#4d7c0f' },
  { key: 'emerald', dot: '#10b981', soft: 'rgba(16,185,129,0.15)', on: '#059669' },
  { key: 'slate', dot: '#64748b', soft: 'rgba(100,116,139,0.14)', on: '#475569' },
];

export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0].key;

/** Renk anahtarini stil nesnesine cozer; bilinmeyen anahtar icin ilk renk. */
export function categoryColor(key: string | null | undefined): CategoryColor {
  return CATEGORY_COLORS.find((c) => c.key === key) ?? CATEGORY_COLORS[0];
}
