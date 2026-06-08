import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SpinnerProps {
  className?: string;
  /** Erisilebilirlik etiketi (gorunmez). */
  label?: string;
}

/** Donen yukleme gostergesi. */
export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span role="status" className="inline-flex items-center">
      <LoaderCircle
        aria-hidden="true"
        className={cn('animate-spin text-[var(--muted)]', className)}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
