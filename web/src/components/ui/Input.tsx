import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Alanin altinda yardimci/hata metni. */
  hint?: string;
  error?: string;
  /** Sol ic ikon. */
  leftIcon?: ReactNode;
}

const fieldBase =
  'w-full min-h-[44px] rounded-2xl border bg-[var(--surface)] px-3.5 text-[0.95rem] text-[var(--text)] ' +
  'placeholder:text-[var(--muted)] transition-colors duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent ' +
  'disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error || hint ? `${inputId}-desc` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--text)]">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            fieldBase,
            leftIcon && 'pl-10',
            error ? 'border-red-400' : 'border-[var(--border)]',
            className,
          )}
          {...rest}
        />
      </div>
      {error || hint ? (
        <p
          id={describedBy}
          className={cn('text-xs', error ? 'text-red-500' : 'text-[var(--muted)]')}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
});
