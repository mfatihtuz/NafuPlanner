import { useRef, useState, type FormEvent } from 'react';
import {
  CircleCheckBig,
  Circle,
  Flag,
  ImagePlus,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useMembers } from '@/features/groups/useGroupData';
import { useCategories } from '@/features/categories/useCategories';
import { useToggleTask } from '@/features/tasks/useTasks';
import {
  useAddComment,
  useAddSubtask,
  useAttachments,
  useComments,
  useDeleteAttachment,
  useDeleteSubtask,
  useDeleteTask,
  useTask,
  useToggleSubtask,
  useUploadAttachment,
} from '@/features/tasks/useTaskMutations';
import { tr } from '@/i18n/tr';
import { cn } from '@/lib/cn';
import { fileUrl } from '@/lib/api';
import { formatDueLabel, formatRelativeTime, isOverdue } from '@/lib/datetime';
import { categoryColor, categoryIcon } from '@/lib/categoryStyle';
import {
  Avatar,
  Button,
  IconButton,
  Modal,
  Spinner,
} from '@/components/ui';
import type { Subtask, Task, TaskAttachment } from '@/types/api';

interface TaskDetailSheetProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  /** Duzenle dugmesi: ust bilesen formu acar. */
  onEdit: (task: Task) => void;
}

/**
 * Gorev ayrinti sheet'i: tum alanlar, alt adim kontrol listesi (kalici toggle),
 * yorumlar (listele + ekle), fotograf ekleri (yukle/sil), duzenle/sil ve
 * tamamla/geri al. Veriler ayri sorgularla cekilir; mutasyonlar onbellegi tazeler.
 */
export function TaskDetailSheet({ taskId, open, onClose, onEdit }: TaskDetailSheetProps) {
  const { currentGroupId, user } = useAuth();
  const { data: task, isLoading, isError } = useTask(taskId, { enabled: open });
  const { data: members } = useMembers(currentGroupId);
  const { data: categories } = useCategories(currentGroupId);

  const toggleTask = useToggleTask(currentGroupId);
  const deleteTask = useDeleteTask(currentGroupId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const done = task?.status === 'done';

  const handleDelete = () => {
    if (!taskId) return;
    deleteTask.mutate(taskId, {
      onSuccess: () => {
        setConfirmDelete(false);
        onClose();
      },
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={tr.tasks.detailTitle}>
      {isLoading || !task ? (
        isError ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">{tr.errors.generic}</p>
        ) : (
          <div className="flex justify-center py-12">
            <Spinner className="h-7 w-7" label={tr.common.loading} />
          </div>
        )
      ) : (
        <div className="space-y-5 py-1">
          {/* Baslik + tamamla */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => toggleTask.mutate({ task })}
              disabled={toggleTask.isPending}
              aria-pressed={done}
              aria-label={done ? tr.tasks.markUndone : tr.tasks.markDone}
              className="mt-0.5 inline-flex h-11 w-11 -m-1.5 shrink-0 items-center justify-center rounded-full hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60"
            >
              {done ? (
                <CircleCheckBig className="h-7 w-7 text-[var(--primary)]" strokeWidth={2.2} />
              ) : (
                <Circle className="h-7 w-7 text-[var(--muted)]" strokeWidth={1.8} />
              )}
            </button>
            <h3
              className={cn(
                'flex-1 text-lg font-semibold leading-snug text-[var(--heading)]',
                done && 'text-[var(--muted)] line-through',
              )}
            >
              {task.title}
            </h3>
          </div>

          {/* Meta rozetleri */}
          <TaskMeta task={task} categories={categories} />

          {task.notes ? (
            <p className="whitespace-pre-wrap rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-[0.95rem] leading-relaxed text-[var(--text)]">
              {task.notes}
            </p>
          ) : null}

          {/* Atananlar */}
          <Assignees assigneeIds={task.assignee_ids} members={members} />

          {/* Alt adimlar */}
          {taskId ? <SubtaskList task={task} groupId={currentGroupId} /> : null}

          {/* Fotograflar */}
          {taskId ? <Attachments taskId={taskId} embedded={task.attachments} /> : null}

          {/* Yorumlar */}
          {taskId ? <Comments taskId={taskId} groupId={currentGroupId} selfName={user?.name} /> : null}

          {/* Eylemler */}
          <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
            <Button
              variant="secondary"
              leftIcon={done ? <Circle className="h-4 w-4" /> : <CircleCheckBig className="h-4 w-4" />}
              onClick={() => toggleTask.mutate({ task })}
              loading={toggleTask.isPending}
            >
              {done ? tr.tasks.uncomplete : tr.tasks.complete}
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => onEdit(task)}
            >
              {tr.common.edit}
            </Button>
            <Button
              variant="ghost"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => setConfirmDelete(true)}
              className="text-red-500"
            >
              {tr.common.delete}
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={tr.tasks.deleteTitle}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {tr.common.cancel}
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteTask.isPending}>
              {tr.common.delete}
            </Button>
          </>
        }
      >
        <p className="py-2 text-[0.97rem] text-[var(--text)]">{tr.tasks.deleteConfirm}</p>
      </Modal>
    </Modal>
  );
}

/** Tarih, oncelik ve kategori rozetleri. */
function TaskMeta({
  task,
  categories,
}: {
  task: Task;
  categories: ReturnType<typeof useCategories>['data'];
}) {
  const dueLabel = formatDueLabel(task.due_at, task.due_has_time);
  const overdue = task.status !== 'done' && isOverdue(task.due_at);
  const category = categories?.find((c) => c.id === task.category_id) ?? null;

  if (!dueLabel && task.priority !== 2 && !category) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {category ? <CategoryBadge name={category.name} color={category.color} icon={category.icon} /> : null}
      {task.priority === 2 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          <Flag className="h-3 w-3" />
          {tr.tasks.priorityHigh}
        </span>
      ) : null}
      {dueLabel ? (
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
            overdue
              ? 'border-red-200 bg-red-50 text-red-600'
              : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]',
          )}
        >
          {dueLabel}
        </span>
      ) : null}
    </div>
  );
}

function CategoryBadge({ name, color, icon }: { name: string; color: string; icon: string }) {
  const c = categoryColor(color);
  const Icon = categoryIcon(icon);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: c.soft, color: c.on }}
    >
      <Icon className="h-3 w-3" />
      {name}
    </span>
  );
}

function Assignees({
  assigneeIds,
  members,
}: {
  assigneeIds: string[] | undefined;
  members: ReturnType<typeof useMembers>['data'];
}) {
  if (!assigneeIds || assigneeIds.length === 0 || !members) return null;
  const assigned = members.filter((m) => assigneeIds.includes(m.user_id));
  if (assigned.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-[var(--muted)]">{tr.tasks.assigneesLabel}</span>
      <div className="flex flex-wrap gap-2">
        {assigned.map((m) => {
          const name = m.display_name ?? m.user?.name ?? '';
          return (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] py-1 pl-1 pr-3 text-sm text-[var(--text)]"
            >
              <Avatar name={name} src={m.user?.avatar_url} size="sm" />
              {name}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Alt adim kontrol listesi; toggle kalicidir (PATCH /api/subtasks/{id}). */
function SubtaskList({ task, groupId }: { task: Task; groupId: string | null }) {
  const subtasks = task.subtasks ?? [];
  const toggle = useToggleSubtask(task.id, groupId);
  const add = useAddSubtask(task.id, groupId);
  const remove = useDeleteSubtask(task.id, groupId);
  const [draft, setDraft] = useState('');

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value) return;
    add.mutate(value, { onSuccess: () => setDraft('') });
  };

  const doneCount = subtasks.filter((s) => s.done).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--muted)]">{tr.tasks.subtasks}</span>
        {subtasks.length > 0 ? (
          <span className="text-xs text-[var(--muted)]">
            {tr.tasks.subtaskProgress(doneCount, subtasks.length)}
          </span>
        ) : null}
      </div>

      {subtasks.length > 0 ? (
        <ul className="space-y-1">
          {subtasks.map((sub: Subtask) => (
            <li key={sub.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggle.mutate(sub)}
                aria-pressed={sub.done}
                aria-label={sub.done ? tr.tasks.markUndone : tr.tasks.markDone}
                className="inline-flex h-10 w-10 -ml-2 shrink-0 items-center justify-center rounded-full hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                {sub.done ? (
                  <CircleCheckBig className="h-5 w-5 text-[var(--primary)]" strokeWidth={2.2} />
                ) : (
                  <Circle className="h-5 w-5 text-[var(--muted)]" strokeWidth={1.8} />
                )}
              </button>
              <span
                className={cn(
                  'flex-1 text-[0.95rem] text-[var(--text)]',
                  sub.done && 'text-[var(--muted)] line-through',
                )}
              >
                {sub.title}
              </span>
              <button
                type="button"
                onClick={() => remove.mutate(sub.id)}
                aria-label={tr.common.remove}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={onAdd} className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={tr.tasks.subtaskPlaceholder}
          aria-label={tr.tasks.addSubtask}
          enterKeyHint="done"
          className="min-h-[40px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[0.95rem] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
        <IconButton
          type="submit"
          label={tr.tasks.addSubtask}
          icon={<Plus className="h-5 w-5" />}
          variant="surface"
          size="sm"
          disabled={add.isPending}
        />
      </form>
    </div>
  );
}

/**
 * Fotograf ekleri: kucuk onizleme izgarasi, yukle ve sil.
 * Detay yaniti ekleri gomulu donduruyorsa (`embedded`) o veri kullanilir;
 * yoksa ayri uctan cekilir. Boylece backend tasarimi iki sekle de uyar.
 */
function Attachments({
  taskId,
  embedded,
}: {
  taskId: string;
  embedded: TaskAttachment[] | undefined;
}) {
  const hasEmbedded = embedded !== undefined;
  const { data, isLoading } = useAttachments(taskId, { enabled: !hasEmbedded });
  const upload = useUploadAttachment(taskId);
  const remove = useDeleteAttachment(taskId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const items = hasEmbedded ? embedded : (data ?? []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      upload.mutate(file);
    }
    // Ayni dosya tekrar secilebilsin diye girisi sifirla.
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--muted)]">{tr.tasks.attachments}</span>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ImagePlus className="h-4 w-4" />}
          onClick={() => inputRef.current?.click()}
          loading={upload.isPending}
        >
          {tr.tasks.addPhoto}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onPick}
        className="hidden"
        aria-hidden="true"
      />

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner className="h-5 w-5" />
        </div>
      ) : items.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((att) => (
            <li
              key={att.id}
              className="group relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]"
            >
              <img
                src={fileUrl(att.file_path)}
                alt={att.original_name ?? ''}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setRemovingId(att.id);
                  remove.mutate(att.id, { onSettled: () => setRemovingId(null) });
                }}
                aria-label={tr.common.remove}
                disabled={removingId === att.id}
                className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-stormy_teal-100/60 text-white backdrop-blur-sm transition-opacity hover:bg-stormy_teal-100/80 disabled:opacity-50"
              >
                {removingId === att.id ? (
                  <Spinner className="h-3.5 w-3.5 text-white" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Yorumlar: listele + ekle. */
function Comments({
  taskId,
  groupId,
  selfName,
}: {
  taskId: string;
  groupId: string | null;
  selfName: string | undefined;
}) {
  const { data, isLoading } = useComments(taskId);
  const add = useAddComment(taskId, groupId);
  const [body, setBody] = useState('');

  const comments = data ?? [];

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = body.trim();
    if (!value) return;
    add.mutate(value, { onSuccess: () => setBody('') });
  };

  return (
    <div className="space-y-2.5">
      <span className="text-sm font-medium text-[var(--muted)]">{tr.tasks.comments}</span>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner className="h-5 w-5" />
        </div>
      ) : comments.length > 0 ? (
        <ul className="space-y-3">
          {comments.map((c) => {
            const name = c.user?.name ?? selfName ?? tr.activity.someone;
            return (
              <li key={c.id} className="flex gap-2.5">
                <Avatar name={name} src={c.user?.avatar_url} size="sm" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-[var(--text)]">{name}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {formatRelativeTime(c.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-[0.95rem] leading-snug text-[var(--text)]">
                    {c.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">{tr.tasks.noComments}</p>
      )}

      <form onSubmit={onSubmit} className="flex items-center gap-2 pt-1">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={tr.tasks.addComment}
          aria-label={tr.tasks.addComment}
          enterKeyHint="send"
          className="min-h-[40px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[0.95rem] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
        <IconButton
          type="submit"
          label={tr.tasks.addComment}
          icon={<Send className="h-4 w-4" />}
          variant="primary"
          size="sm"
          disabled={add.isPending || !body.trim()}
        />
      </form>
    </div>
  );
}
