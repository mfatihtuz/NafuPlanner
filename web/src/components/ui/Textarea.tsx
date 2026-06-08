import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, hint, error, id, className, rows = 3, ...rest }, ref) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const describedBy = error || hint ? `${fieldId}-desc` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={fieldId} className="text-sm font-medium text-[var(--text)]">
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full resize-y rounded-2xl border bg-[var(--surface)] px-3.5 py-2.5 text-[0.95rem] text-[var(--text)]',
            'placeholder:text-[var(--muted)] transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent disabled:opacity-60',
            error ? 'border-red-400' : 'border-[var(--border)]',
            className,
          )}
          {...rest}
        />
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
  },
);
