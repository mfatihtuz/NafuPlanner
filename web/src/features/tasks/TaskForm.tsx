import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useCategories } from '@/features/categories/useCategories';
import { useMembers } from '@/features/groups/useGroupData';
import {
  useCreateTask,
  useUpdateTask,
  type TaskInput,
} from '@/features/tasks/useTaskMutations';
import { tr } from '@/i18n/tr';
import { cn } from '@/lib/cn';
import { isoToLocalParts, localPartsToIso } from '@/lib/datetime';
import { categoryColor, categoryIcon } from '@/lib/categoryStyle';
import {
  Avatar,
  Button,
  Input,
  Modal,
  SegmentedControl,
  Textarea,
  type SegmentOption,
} from '@/components/ui';
import type { Priority, Subtask, Task } from '@/types/api';

const priorityOptions: SegmentOption<string>[] = [
  { value: '0', label: tr.tasks.priorityLow },
  { value: '1', label: tr.tasks.priorityNormal },
  { value: '2', label: tr.tasks.priorityHigh },
];

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  /** Verilirse duzenleme modu; yoksa yeni gorev. */
  task?: Task | null;
  /** Olusturma/guncelleme sonrasi (ornek: detay sheet'ini tazelemek icin). */
  onSaved?: (task: Task) => void;
}

/** Yeni alt adimlar henuz sunucuda olmadigi icin gecici yerel kimlik. */
interface DraftSubtask {
  id: string;
  title: string;
  done: boolean;
  /** Var olan (kayitli) alt adim mi. */
  persisted: boolean;
}

function toDraft(subtasks: Subtask[] | undefined): DraftSubtask[] {
  return (subtasks ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    done: s.done,
    persisted: true,
  }));
}

/**
 * Gorev olustur/duzenle alt sheet'i. Tum alanlar: baslik (zorunlu), not,
 * kategori, oncelik, son tarih + istege bagli saat, atananlar, alt adimlar,
 * etiketler. Kaydetme react-query mutasyonu ile yapilir.
 *
 * Not: Duzenleme modunda baslik/not/oncelik/tarih/kategori/atananlar PATCH ile
 * gonderilir. Yeni gorevde alt adimlar olusturulduktan sonra tek tek eklenir.
 */
export function TaskForm({ open, onClose, task, onSaved }: TaskFormProps) {
  const { currentGroupId } = useAuth();
  const isEdit = Boolean(task);

  const { data: categories } = useCategories(currentGroupId);
  const { data: members } = useMembers(currentGroupId);

  const createTask = useCreateTask(currentGroupId);
  const updateTask = useUpdateTask(currentGroupId);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>(1);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [hasTime, setHasTime] = useState(false);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<DraftSubtask[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  // Sunucu mevcut etiketleri verdiyse tam liste (bos dahil) gonderilebilir;
  // vermediyse sadece kullanici yeni etiket eklediginde gonderilir.
  const [tagsKnown, setTagsKnown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sheet acildiginda alanlari (duzenleme verisiyle ya da bos) yukle.
  useEffect(() => {
    if (!open) return;
    const parts = isoToLocalParts(task?.due_at ?? null);
    setTitle(task?.title ?? '');
    setNotes(task?.notes ?? '');
    setCategoryId(task?.category_id ?? null);
    setPriority(task?.priority ?? 1);
    setDueDate(parts.date);
    setDueTime(parts.time);
    setHasTime(Boolean(task?.due_has_time));
    setAssignees(task?.assignee_ids ?? []);
    setSubtasks(toDraft(task?.subtasks));
    setSubtaskDraft('');
    setTags(task?.tags ?? []);
    setTagsKnown(task?.tags !== undefined);
    setTagDraft('');
    setError(null);
  }, [open, task]);

  const memberList = useMemo(() => members ?? [], [members]);
  const saving = createTask.isPending || updateTask.isPending;

  const toggleAssignee = (userId: string) => {
    setAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const addSubtask = () => {
    const value = subtaskDraft.trim();
    if (!value) return;
    setSubtasks((prev) => [
      ...prev,
      { id: `draft-${Date.now()}-${prev.length}`, title: value, done: false, persisted: false },
    ]);
    setSubtaskDraft('');
  };

  const addTag = () => {
    const value = tagDraft.trim();
    if (!value || tags.includes(value)) {
      setTagDraft('');
      return;
    }
    setTags((prev) => [...prev, value]);
    setTagDraft('');
  };

  const submit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(tr.errors.validation);
      return;
    }
    setError(null);

    const due_at = dueDate ? localPartsToIso(dueDate, hasTime ? dueTime || '00:00' : null) : null;
    const payload: TaskInput = {
      title: trimmedTitle,
      notes: notes.trim() || null,
      category_id: categoryId,
      priority,
      due_at,
      due_has_time: Boolean(due_at) && hasTime,
      assignee_ids: assignees,
      // Sunucu mevcut etiketleri verdiyse (tagsKnown) tam liste gonderilir,
      // boylece silme de kalici olur. Vermediyse yalnizca yeni etiket girildiyse
      // gonderilir; boylece duzenlemede var olan etiketler yanlislikla silinmez.
      ...(tagsKnown || tags.length > 0 ? { tags } : {}),
    };

    try {
      if (isEdit && task) {
        const updated = await updateTask.mutateAsync({ id: task.id, ...payload });
        onSaved?.(updated);
      } else {
        const created = await createTask.mutateAsync(payload);
        // Yeni gorevde taslak alt adimlari sirayla ekle (en iyi caba).
        const drafts = subtasks.filter((s) => !s.persisted);
        for (const draft of drafts) {
          try {
            await api.post(`/tasks/${created.id}/subtasks`, { title: draft.title });
          } catch {
            // Tek bir alt adim eklenemese de gorev kaydedildi; sessiz gec.
          }
        }
        onSaved?.(created);
      }
      onClose();
    } catch {
      setError(tr.tasks.saveFailed);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? tr.tasks.editTask : tr.tasks.newTask}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {tr.common.cancel}
          </Button>
          <Button onClick={() => void submit()} loading={saving}>
            {saving ? tr.common.saving : tr.common.save}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-5 py-1"
      >
        <Input
          label={tr.tasks.titleLabel}
          placeholder={tr.tasks.titlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={error ?? undefined}
          autoFocus={!isEdit}
          maxLength={200}
          enterKeyHint="done"
        />

        <Textarea
          label={`${tr.tasks.notesLabel} (${tr.common.optional})`}
          placeholder={tr.tasks.notesPlaceholder}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={2000}
        />

        {/* Oncelik */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-[var(--text)]">{tr.tasks.priorityLabel}</span>
          <SegmentedControl
            options={priorityOptions}
            value={String(priority)}
            onChange={(v) => setPriority(Number(v) as Priority)}
            ariaLabel={tr.tasks.priorityLabel}
          />
        </div>

        {/* Kategori */}
        {categories && categories.length > 0 ? (
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-[var(--text)]">{tr.tasks.categoryLabel}</span>
            <div className="flex flex-wrap gap-2">
              <CategoryPill
                active={categoryId === null}
                onClick={() => setCategoryId(null)}
                label={tr.tasks.noCategory}
              />
              {categories.map((cat) => {
                const Icon = categoryIcon(cat.icon);
                const color = categoryColor(cat.color);
                const active = categoryId === cat.id;
                return (
                  <CategoryPill
                    key={cat.id}
                    active={active}
                    onClick={() => setCategoryId(active ? null : cat.id)}
                    label={cat.name}
                    icon={<Icon className="h-3.5 w-3.5" style={{ color: color.on }} />}
                    softColor={color.soft}
                    onColor={color.on}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Son tarih + saat */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-[var(--text)]">{tr.tasks.dueLabel}</span>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[9rem] flex-1">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (!e.target.value) setHasTime(false);
                }}
                aria-label={tr.tasks.dueDateLabel}
                className="w-full min-h-[44px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[0.95rem] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            {dueDate && hasTime ? (
              <div className="flex items-end gap-1">
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  aria-label={tr.tasks.dueTimeLabel}
                  className="min-h-[44px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[0.95rem] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHasTime(false)}
                  aria-label={tr.common.remove}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : dueDate ? (
              <Button variant="secondary" size="sm" onClick={() => setHasTime(true)}>
                {tr.tasks.addTime}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Atananlar */}
        {memberList.length > 0 ? (
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-[var(--text)]">{tr.tasks.assigneesLabel}</span>
            <div className="flex flex-wrap gap-2">
              {memberList.map((member) => {
                const name = member.display_name ?? member.user?.name ?? '';
                const active = assignees.includes(member.user_id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleAssignee(member.user_id)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex min-h-[40px] items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                      active
                        ? 'border-[var(--primary)] bg-[var(--surface-2)] text-[var(--text)]'
                        : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]',
                    )}
                  >
                    <Avatar name={name} src={member.user?.avatar_url} size="sm" />
                    <span className="truncate max-w-[8rem]">{name}</span>
                    {active ? <Check className="h-4 w-4 text-[var(--primary)]" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Alt adimlar */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-[var(--text)]">{tr.tasks.subtasks}</span>
          {subtasks.length > 0 ? (
            <ul className="space-y-1.5">
              {subtasks.map((sub, i) => (
                <li
                  key={sub.id}
                  className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-[0.95rem] text-[var(--text)]"
                >
                  <span className="flex-1 truncate">{sub.title}</span>
                  <button
                    type="button"
                    onClick={() => setSubtasks((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={tr.common.remove}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                placeholder={tr.tasks.subtaskPlaceholder}
                value={subtaskDraft}
                onChange={(e) => setSubtaskDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSubtask();
                  }
                }}
                aria-label={tr.tasks.addSubtask}
                enterKeyHint="done"
              />
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={addSubtask}
              aria-label={tr.tasks.addSubtask}
              className="px-3"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Etiketler */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-[var(--text)]">{tr.tasks.tagsLabel}</span>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] py-1 pl-2.5 pr-1 text-xs text-[var(--text)]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    aria-label={tr.common.remove}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <Input
            placeholder={tr.tasks.tagsPlaceholder}
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            aria-label={tr.tasks.tagsLabel}
            enterKeyHint="done"
          />
        </div>
      </form>
    </Modal>
  );
}

/** Kategori secimi icin yumusak renkli secilebilir pill. */
function CategoryPill({
  active,
  onClick,
  label,
  icon,
  softColor,
  onColor,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: ReactNode;
  softColor?: string;
  onColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={active && softColor ? { backgroundColor: softColor, color: onColor } : undefined}
      className={cn(
        'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        active
          ? 'border-transparent font-medium'
          : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
