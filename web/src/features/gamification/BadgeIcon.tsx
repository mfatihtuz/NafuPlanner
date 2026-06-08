import {
  Award,
  CheckCheck,
  Flame,
  Medal,
  Sparkles,
  Star,
  Sunrise,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

/** Rozet `icon` adini (db/seed.sql) Lucide bilesenine esler. Bilinmeyen -> Award. */
const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  sparkle: Sparkles,
  'check-check': CheckCheck,
  medal: Medal,
  trophy: Trophy,
  flame: Flame,
  star: Star,
  sunrise: Sunrise,
  award: Award,
};

export function BadgeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Award;
  return <Icon className={className} aria-hidden="true" />;
}
