import { CircleCheckBig, Circle, Flag, ListChecks, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Category, GroupMember, Task } from '@/types/api';
import { cn } from '@/lib/cn';
import { formatDueLabel, isOverdue } from '@/lib/datetime';
import { categoryColor, categoryIcon } from '@/lib/categoryStyle';
import { tr } from '@/i18n/tr';
import { Avatar, Chip } from '@/components/ui';

interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  /** Satira (daire disinda) dokununca ayrintiyi acar. */
  onOpen?: (task: Task) => void;
  /** Kategori rozetini zenginlestirmek icin (renk/ikon). */
  categories?: Category[];
  /** Atanan avatarlarini gostermek icin grup uyeleri. */
  members?: GroupMember[];
  /** Yukleniyor: cift dokunmayi onlemek icin gecici kilit. */
  pending?: boolean;
}

/**
 * Tek gorev satiri. Daireye dokununca kisa, hizli bir tik animasyonu (olcek +
 * soluklasma) oynatilir ve metin ustu cizilir; satirin geri kalanina dokununca
 * ayrinti acilir.
 */
export function TaskItem({
  task,
  onToggle,
  onOpen,
  categories,
  members,
  pending,
}: TaskItemProps) {
  const done = task.status === 'done';
  const dueLabel = formatDueLabel(task.due_at, task.due_has_time);
  const overdue = !done && isOverdue(task.due_at);

  const category = categories?.find((c) => c.id === task.category_id) ?? null;
  const assignees =
    members && task.assignee_ids
      ? members.filter((m) => task.assignee_ids?.includes(m.user_id))
      : [];
  const subtasks = task.subtasks ?? [];
  const subtaskDone = subtasks.filter((s) => s.done).length;
  const commentCount = task.comment_count ?? 0;

  const CategoryIcon = category ? categoryIcon(category.icon) : null;
  const catColor = category ? categoryColor(category.color) : null;

  const hasMeta =
    Boolean(dueLabel) ||
    task.priority === 2 ||
    Boolean(category) ||
    assignees.length > 0 ||
    subtasks.length > 0 ||
    commentCount > 0;

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

      <button
        type="button"
        onClick={onOpen ? () => onOpen(task) : undefined}
        disabled={!onOpen}
        className={cn(
          'min-w-0 flex-1 text-left',
          onOpen &&
            'rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        )}
      >
        <p
          className={cn(
            'text-[0.97rem] leading-snug text-[var(--text)]',
            done && 'text-[var(--muted)] line-through',
          )}
        >
          {task.title}
        </p>

        {hasMeta ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {category && CategoryIcon && catColor ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: catColor.soft, color: catColor.on }}
              >
                <CategoryIcon className="h-3 w-3" />
                {category.name}
              </span>
            ) : null}
            {task.priority === 2 ? (
              <Chip tone="warning" icon={<Flag className="h-3 w-3" />}>
                {tr.tasks.priorityHigh}
              </Chip>
            ) : null}
            {dueLabel ? (
              <Chip tone={overdue ? 'danger' : 'neutral'}>{dueLabel}</Chip>
            ) : null}
            {subtasks.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                <ListChecks className="h-3.5 w-3.5" />
                {subtaskDone}/{subtasks.length}
              </span>
            ) : null}
            {commentCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                <MessageSquare className="h-3.5 w-3.5" />
                {commentCount}
              </span>
            ) : null}
            {assignees.length > 0 ? (
              <span className="ml-auto inline-flex -space-x-1.5">
                {assignees.slice(0, 3).map((m) => (
                  <Avatar
                    key={m.id}
                    name={m.display_name ?? m.user?.name ?? ''}
                    src={m.user?.avatar_url}
                    size="sm"
                    className="ring-2 ring-[var(--surface)]"
                  />
                ))}
              </span>
            ) : null}
          </div>
        ) : null}
      </button>
    </motion.li>
  );
}
