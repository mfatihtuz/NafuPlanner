import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ListTodo, Plus } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useTasks, useToggleTask, type TaskScope } from '@/features/tasks/useTasks';
import { useCategories } from '@/features/categories/useCategories';
import { useMembers } from '@/features/groups/useGroupData';
import { TaskItem } from '@/features/tasks/TaskItem';
import { TaskForm } from '@/features/tasks/TaskForm';
import { TaskDetailSheet } from '@/features/tasks/TaskDetailSheet';
import { tr } from '@/i18n/tr';
import {
  EmptyState,
  IconButton,
  SegmentedControl,
  Select,
  Spinner,
  type SegmentOption,
} from '@/components/ui';
import type { Task } from '@/types/api';

const scopeOptions: SegmentOption<TaskScope>[] = [
  { value: 'today', label: tr.tasks.filterToday },
  { value: 'all', label: tr.tasks.filterAll },
  { value: 'overdue', label: tr.tasks.filterOverdue },
  { value: 'upcoming', label: tr.tasks.filterUpcoming },
];

export function TasksPage() {
  const { currentGroupId } = useAuth();
  const [scope, setScope] = useState<TaskScope>('all');
  const [categoryId, setCategoryId] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');

  const { data: categories } = useCategories(currentGroupId);
  const { data: members } = useMembers(currentGroupId);

  const { data, isLoading, isError, refetch } = useTasks({
    groupId: currentGroupId,
    scope,
    category: categoryId || undefined,
    assignee: assigneeId || undefined,
  });
  const toggle = useToggleTask(currentGroupId);

  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);

  // Acik isler ustte, tamamlananlar altta; her grup kendi icinde sirayi korur.
  const visible = useMemo(() => {
    const tasks = data ?? [];
    const open = tasks.filter((t) => t.status === 'open');
    const done = tasks.filter((t) => t.status === 'done');
    return [...open, ...done];
  }, [data]);

  const handleToggle = (task: Task) => toggle.mutate({ task });
  const pendingId = toggle.isPending ? (toggle.variables?.task.id ?? null) : null;

  const hasFilters = Boolean(categoryId || assigneeId) || scope !== 'all';

  const openEdit = (task: Task) => {
    setDetailId(null);
    setEditing(task);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[var(--heading)]">{tr.tasks.title}</h1>
        <IconButton
          label={tr.tasks.newTask}
          icon={<Plus className="h-5 w-5" />}
          variant="primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        />
      </div>

      <SegmentedControl
        options={scopeOptions}
        value={scope}
        onChange={setScope}
        ariaLabel={tr.tasks.scopeLabel}
      />

      <div className="flex gap-2">
        <Select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label={tr.tasks.categoryLabel}
          className="flex-1"
        >
          <option value="">{tr.tasks.allCategories}</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          aria-label={tr.tasks.assigneesLabel}
          className="flex-1"
        >
          <option value="">{tr.tasks.allAssignees}</option>
          {(members ?? []).map((m) => (
            <option key={m.id} value={m.user_id}>
              {m.display_name ?? m.user?.name ?? ''}
            </option>
          ))}
        </Select>
      </div>

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
          title={hasFilters ? tr.tasks.emptyFilteredTitle : tr.tasks.emptyTitle}
          description={hasFilters ? tr.tasks.emptyFilteredBody : tr.tasks.emptyBody}
        />
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {visible.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onOpen={(t) => setDetailId(t.id)}
                categories={categories}
                members={members}
                pending={pendingId === task.id}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        task={editing}
        onSaved={() => setFormOpen(false)}
      />
      <TaskDetailSheet
        taskId={detailId}
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        onEdit={openEdit}
      />
    </div>
  );
}
