import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Alt eylem (ornek: bir buton). */
  action?: ReactNode;
  className?: string;
}

/** Zarif bos durum: ikon, baslik, kisa aciklama ve istege bagli eylem. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--muted)]">
          {icon}
        </span>
      ) : null}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--heading)]">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-xs text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
