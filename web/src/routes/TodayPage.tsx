import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CalendarCheck, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useTasks, useToggleTask } from '@/features/tasks/useTasks';
import { useCreateTask } from '@/features/tasks/useTaskMutations';
import { useCategories } from '@/features/categories/useCategories';
import { useMembers } from '@/features/groups/useGroupData';
import { TaskItem } from '@/features/tasks/TaskItem';
import { TaskForm } from '@/features/tasks/TaskForm';
import { TaskDetailSheet } from '@/features/tasks/TaskDetailSheet';
import { greetingForHour } from '@/lib/datetime';
import { tr } from '@/i18n/tr';
import { Card, EmptyState, IconButton, Spinner } from '@/components/ui';
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
  onOpen,
  pendingId,
  categories,
  members,
}: {
  title: string;
  tasks: Task[];
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
  pendingId: string | null;
  categories: ReturnType<typeof useCategories>['data'];
  members: ReturnType<typeof useMembers>['data'];
}) {
  if (tasks.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-semibold text-[var(--muted)]">{title}</h2>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onOpen={onOpen}
              categories={categories}
              members={members}
              pending={pendingId === task.id}
            />
          ))}
        </AnimatePresence>
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
  const { data: categories } = useCategories(currentGroupId);
  const { data: members } = useMembers(currentGroupId);
  const toggle = useToggleTask(currentGroupId);
  const createTask = useCreateTask(currentGroupId);

  const [quickTitle, setQuickTitle] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);

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
    if (tasks.length === 0) return null;
    if (remaining === 0) return tr.today.allDone;
    if (remaining === 1) return tr.today.summaryOne;
    return tr.today.summaryMany(remaining);
  }, [remaining, tasks.length]);

  const handleToggle = (task: Task) => toggle.mutate({ task });
  const pendingId = toggle.isPending ? (toggle.variables?.task.id ?? null) : null;

  const onQuickAdd = (e: FormEvent) => {
    e.preventDefault();
    const value = quickTitle.trim();
    if (!value) return;
    // Bugunku gorev: gunun sonuna (saatsiz) bitis ver, boylece "bugun" kapsamina girer.
    const today = new Date();
    const dueAt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59).toISOString();
    createTask.mutate(
      { title: value, due_at: dueAt, due_has_time: false },
      { onSuccess: () => setQuickTitle('') },
    );
  };

  const openEdit = (task: Task) => {
    setDetailId(null);
    setEditing(task);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <Greeting />
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

      {/* Hizli ekleme */}
      <form onSubmit={onQuickAdd} className="flex items-center gap-2">
        <input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder={tr.today.quickAddPlaceholder}
          aria-label={tr.tasks.addTask}
          enterKeyHint="done"
          className="min-h-[48px] flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[0.97rem] text-[var(--text)] placeholder:text-[var(--muted)] shadow-subtle focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
        <IconButton
          type="submit"
          label={tr.tasks.addTask}
          icon={<Plus className="h-5 w-5" />}
          variant="surface"
          disabled={createTask.isPending || !quickTitle.trim()}
        />
      </form>

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
          {summary ? (
            <Card padding="md" className="bg-[var(--surface-2)] shadow-none">
              <p className="text-[0.97rem] text-[var(--text)]">{summary}</p>
            </Card>
          ) : null}

          <div className="space-y-5">
            <TaskGroup
              title={tr.today.overdueTitle}
              tasks={overdue}
              onToggle={handleToggle}
              onOpen={(t) => setDetailId(t.id)}
              pendingId={pendingId}
              categories={categories}
              members={members}
            />
            <TaskGroup
              title={tr.today.todayTitle}
              tasks={open}
              onToggle={handleToggle}
              onOpen={(t) => setDetailId(t.id)}
              pendingId={pendingId}
              categories={categories}
              members={members}
            />
            <TaskGroup
              title={tr.today.completedTitle}
              tasks={done}
              onToggle={handleToggle}
              onOpen={(t) => setDetailId(t.id)}
              pendingId={pendingId}
              categories={categories}
              members={members}
            />
          </div>
        </>
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
