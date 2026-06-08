import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

/** Erisilebilir onay kutusu. Gercek input gizli; gorsel kutu uzerine tik biner. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, id, className, checked, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <label
      htmlFor={fieldId}
      className={cn(
        'inline-flex min-h-[44px] cursor-pointer select-none items-center gap-3',
        className,
      )}
    >
      <span className="relative inline-flex">
        <input
          ref={ref}
          id={fieldId}
          type="checkbox"
          checked={checked}
          className="peer sr-only"
          {...rest}
        />
        <span
          aria-hidden="true"
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-colors duration-150',
            'border-[var(--border)] bg-[var(--surface)]',
            'peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary)]',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ring)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--bg)]',
            '[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
          )}
        >
          <Check
            className="h-4 w-4 text-[var(--primary-contrast)] transition-opacity duration-150"
            strokeWidth={3}
          />
        </span>
      </span>
      {label ? <span className="text-[0.95rem] text-[var(--text)]">{label}</span> : null}
    </label>
  );
});
