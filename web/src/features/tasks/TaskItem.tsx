import { CircleCheckBig, Circle, Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Task } from '@/types/api';
import { cn } from '@/lib/cn';
import { formatDueLabel, isOverdue } from '@/lib/datetime';
import { tr } from '@/i18n/tr';
import { Chip } from '@/components/ui';

interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  /** Yukleniyor: cift dokunmayi onlemek icin gecici kilit. */
  pending?: boolean;
}

/**
 * Tek gorev satiri. Tamamlama dokunusunda kisa, hizli bir tik animasyonu
 * (olcek + soluklasma) oynatilir; metin ustu cizilir.
 */
export function TaskItem({ task, onToggle, pending }: TaskItemProps) {
  const done = task.status === 'done';
  const dueLabel = formatDueLabel(task.due_at, task.due_has_time);
  const overdue = !done && isOverdue(task.due_at);

  return (
    <motion.li
      layout
      initial={false}
      animate={{ opacity: done ? 0.6 : 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-subtle',
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        disabled={pending}
        aria-pressed={done}
        aria-label={done ? tr.tasks.markUndone : tr.tasks.markDone}
        className={cn(
          'mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full -m-2',
          'transition-colors duration-150 hover:bg-[var(--surface-2)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
          'disabled:opacity-60',
        )}
      >
        <motion.span
          key={done ? 'done' : 'open'}
          initial={{ scale: 0.6, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="inline-flex"
        >
          {done ? (
            <CircleCheckBig className="h-6 w-6 text-[var(--primary)]" strokeWidth={2.2} />
          ) : (
            <Circle className="h-6 w-6 text-[var(--muted)]" strokeWidth={1.8} />
          )}
        </motion.span>
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-[0.97rem] leading-snug text-[var(--text)]',
            done && 'text-[var(--muted)] line-through',
          )}
        >
          {task.title}
        </p>

        {dueLabel || task.priority === 2 ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {task.priority === 2 ? (
              <Chip tone="warning" icon={<Flag className="h-3 w-3" />}>
                {tr.tasks.priorityHigh}
              </Chip>
            ) : null}
            {dueLabel ? (
              <Chip tone={overdue ? 'danger' : 'neutral'}>{dueLabel}</Chip>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.li>
  );
}
