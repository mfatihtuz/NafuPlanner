import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'ghost' | 'surface' | 'primary';
type Size = 'sm' | 'md';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Erisilebilirlik icin zorunlu etiket. */
  label: string;
  icon: ReactNode;
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  ghost: 'text-[var(--text)] hover:bg-[var(--surface-2)]',
  surface:
    'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)]',
  primary: 'bg-[var(--primary)] text-[var(--primary-contrast)] hover:brightness-105',
};

const sizes: Record<Size, string> = {
  sm: 'h-10 w-10',
  md: 'h-11 w-11',
};

/** Yalnizca ikon iceren, 44px dokunma hedefli erisilebilir buton. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, icon, variant = 'ghost', size = 'md', className, type = 'button', ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex items-center justify-center rounded-full transition-colors duration-150 ease-gentle',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
          'disabled:opacity-60 disabled:pointer-events-none active:scale-[0.96]',
          variants[variant],
          sizes[size],
          className,
        )}
        {...rest}
      >
        {icon}
      </button>
    );
  },
);
