import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Yukleniyor durumu: butonu kilitler ve spinner gosterir. */
  loading?: boolean;
  /** Metnin solunda ikon. */
  leftIcon?: ReactNode;
  /** Metnin saginda ikon. */
  rightIcon?: ReactNode;
  /** Tam genislik. */
  block?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-2xl font-medium ' +
  'transition-[background-color,box-shadow,transform] duration-150 ease-gentle ' +
  'select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ' +
  'disabled:opacity-60 disabled:pointer-events-none active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--primary)] text-[var(--primary-contrast)] shadow-subtle hover:brightness-[1.05]',
  secondary:
    'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)]',
  ghost: 'bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)]',
  danger: 'bg-red-500 text-white shadow-subtle hover:brightness-105',
};

// En az 44px dokunma hedefi (min-h) korunur.
const sizes: Record<Size, string> = {
  sm: 'min-h-[40px] px-3.5 text-sm',
  md: 'min-h-[44px] px-4 text-[0.95rem]',
  lg: 'min-h-[52px] px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    block = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], block && 'w-full', className)}
      {...rest}
    >
      {loading ? (
        <Spinner className="h-[1.1em] w-[1.1em]" />
      ) : (
        leftIcon && <span className="-ml-0.5 inline-flex shrink-0">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon ? (
        <span className="-mr-0.5 inline-flex shrink-0">{rightIcon}</span>
      ) : null}
    </button>
  );
});
