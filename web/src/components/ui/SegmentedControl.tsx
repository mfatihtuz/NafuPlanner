import { cn } from '@/lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Erisilebilirlik etiketi (gorunmez). */
  ariaLabel?: string;
  className?: string;
}

/** Az sayida secenek arasinda gecis icin segment kontrolu (tab benzeri). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'min-h-[40px] flex-1 rounded-xl px-3 text-sm font-medium transition-colors duration-150 ease-gentle',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
              active
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-subtle'
                : 'text-[var(--muted)] hover:text-[var(--text)]',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
