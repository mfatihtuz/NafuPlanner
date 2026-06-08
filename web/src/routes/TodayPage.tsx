import { useMemo } from 'react';
import { CalendarCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useTasks, useToggleTask } from '@/features/tasks/useTasks';
import { TaskItem } from '@/features/tasks/TaskItem';
import { greetingForHour } from '@/lib/datetime';
import { tr } from '@/i18n/tr';
import { Card, EmptyState, Spinner } from '@/components/ui';
import type { Task } from '@/types/api';

/** Selam satiri: gunun saatine gore + (varsa) ad. */
function Greeting() {
  const { user, currentGroup } = useAuth();
  const greeting = greetingForHour();
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold text-[var(--heading)]">
        {firstName ? tr.today.greetingWithName(greeting, firstName) : greeting}
      </h1>
      {currentGroup ? (
        <p className="text-sm text-[var(--muted)]">{currentGroup.name}</p>
      ) : null}
    </div>
  );
}

/** Bir gorev grubunu baslikla listeler. */
function TaskGroup({
  title,
  tasks,
  onToggle,
  pendingId,
}: {
  title: string;
  tasks: Task[];
  onToggle: (task: Task) => void;
  pendingId: string | null;
}) {
  if (tasks.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-semibold text-[var(--muted)]">{title}</h2>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            pending={pendingId === task.id}
          />
        ))}
      </ul>
    </section>
  );
}

export function TodayPage() {
  const { currentGroupId } = useAuth();
  const { data, isLoading, isError, refetch } = useTasks({
    groupId: currentGroupId,
    scope: 'today',
  });
  const toggle = useToggleTask(currentGroupId);

  const tasks = useMemo(() => data ?? [], [data]);

  // Gecikenleri ve bugunku acik isleri ayir; tamamlananlar en altta.
  const { overdue, open, done } = useMemo(() => {
    const now = Date.now();
    const overdue: Task[] = [];
    const open: Task[] = [];
    const done: Task[] = [];
    for (const task of tasks) {
      if (task.status === 'done') {
        done.push(task);
      } else if (task.due_at && new Date(task.due_at).getTime() < now) {
        overdue.push(task);
      } else {
        open.push(task);
      }
    }
    return { overdue, open, done };
  }, [tasks]);

  const remaining = overdue.length + open.length;

  const summary = useMemo(() => {
    if (remaining === 0) return tr.today.allDone;
    if (remaining === 1) return tr.today.summaryOne;
    return tr.today.summaryMany(remaining);
  }, [remaining]);

  const handleToggle = (task: Task) => toggle.mutate({ task });
  const pendingId = toggle.isPending
    ? (toggle.variables?.task.id ?? null)
    : null;

  return (
    <div className="space-y-6">
      <Greeting />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" label={tr.common.loading} />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<CalendarCheck className="h-6 w-6" />}
          title={tr.errors.generic}
          description={tr.errors.network}
          action={
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-sm font-medium text-[var(--primary)]"
            >
              {tr.common.retry}
            </button>
          }
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title={tr.today.noTasksTitle}
          description={tr.today.noTasksBody}
        />
      ) : (
        <>
          <Card padding="md" className="bg-[var(--surface-2)] shadow-none">
            <p className="text-[0.97rem] text-[var(--text)]">{summary}</p>
          </Card>

          <div className="space-y-5">
            <TaskGroup
              title={tr.today.overdueTitle}
              tasks={overdue}
              onToggle={handleToggle}
              pendingId={pendingId}
            />
            <TaskGroup
              title={tr.today.todayTitle}
              tasks={open}
              onToggle={handleToggle}
              pendingId={pendingId}
            />
            <TaskGroup
              title={tr.tasks.completed}
              tasks={done}
              onToggle={handleToggle}
              pendingId={pendingId}
            />
          </div>
        </>
      )}
    </div>
  );
}
