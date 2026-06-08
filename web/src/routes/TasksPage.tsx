import { useMemo, useState } from 'react';
import { ListTodo } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useTasks, useToggleTask } from '@/features/tasks/useTasks';
import { TaskItem } from '@/features/tasks/TaskItem';
import { tr } from '@/i18n/tr';
import { EmptyState, SegmentedControl, Spinner, type SegmentOption } from '@/components/ui';
import type { Task } from '@/types/api';

type Filter = 'all' | 'open' | 'done';

const filterOptions: SegmentOption<Filter>[] = [
  { value: 'all', label: tr.tasks.filterAll },
  { value: 'open', label: tr.tasks.filterOpen },
  { value: 'done', label: tr.tasks.filterDone },
];

export function TasksPage() {
  const { currentGroupId } = useAuth();
  const [filter, setFilter] = useState<Filter>('open');

  const { data, isLoading, isError, refetch } = useTasks({
    groupId: currentGroupId,
    scope: 'all',
  });
  const toggle = useToggleTask(currentGroupId);

  const visible = useMemo(() => {
    const tasks = data ?? [];
    if (filter === 'open') return tasks.filter((t) => t.status === 'open');
    if (filter === 'done') return tasks.filter((t) => t.status === 'done');
    return tasks;
  }, [data, filter]);

  const handleToggle = (task: Task) => toggle.mutate({ task });
  const pendingId = toggle.isPending ? (toggle.variables?.task.id ?? null) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[var(--heading)]">{tr.tasks.title}</h1>
      </div>

      <SegmentedControl
        options={filterOptions}
        value={filter}
        onChange={setFilter}
        ariaLabel={tr.tasks.title}
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" label={tr.common.loading} />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<ListTodo className="h-6 w-6" />}
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
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-6 w-6" />}
          title={tr.tasks.emptyTitle}
          description={tr.tasks.emptyBody}
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={handleToggle}
              pending={pendingId === task.id}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
