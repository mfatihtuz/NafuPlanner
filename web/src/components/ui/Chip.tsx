import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'primary' | 'accent' | 'warning' | 'danger';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: ReactNode;
}

const tones: Record<Tone, string> = {
  neutral: 'bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]',
  primary: 'bg-tropical_teal-900 text-teal-200 border-tropical_teal-800',
  accent: 'bg-pearl_aqua-900 text-stormy_teal-200 border-pearl_aqua-800',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-600 border-red-200',
};

/** Kucuk etiket/rozet. Durum ve kategori isaretlemek icin. */
export function Chip({ tone = 'neutral', icon, className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      {children}
    </span>
  );
}
