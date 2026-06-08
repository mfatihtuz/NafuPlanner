import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Tiklanabilir kart gorunumu (hover/aktif geri bildirimi). */
  interactive?: boolean;
  /** Ic bosluk seviyesi. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
} as const;

/** Yumusak koseli, hafif golgeli yuzey. */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, padding = 'md', className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-subtle',
        interactive &&
          'cursor-pointer transition-[box-shadow,transform] duration-150 ease-gentle hover:shadow-card active:scale-[0.995]',
        paddings[padding],
        className,
      )}
      {...rest}
    />
  );
});
