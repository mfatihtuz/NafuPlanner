import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Tags, Trash2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
  type CategoryInput,
} from '@/features/categories/useCategories';
import {
  CATEGORY_COLORS,
  CATEGORY_ICON_NAMES,
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
  categoryColor,
  categoryIcon,
} from '@/lib/categoryStyle';
import { tr } from '@/i18n/tr';
import { cn } from '@/lib/cn';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  Modal,
  Spinner,
} from '@/components/ui';
import type { Category } from '@/types/api';

export function CategoriesPage() {
  const navigate = useNavigate();
  const { currentGroupId } = useAuth();
  const { data, isLoading, isError, refetch } = useCategories(currentGroupId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const deleteCategory = useDeleteCategory(currentGroupId);

  const categories = data ?? [];

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (cat: Category) => {
    setEditing(cat);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <IconButton
          label={tr.common.back}
          icon={<ChevronLeft className="h-5 w-5" />}
          onClick={() => navigate(-1)}
        />
        <h1 className="flex-1 text-2xl font-semibold text-[var(--heading)]">
          {tr.categories.title}
        </h1>
        <IconButton
          label={tr.categories.add}
          icon={<Plus className="h-5 w-5" />}
          variant="primary"
          onClick={openNew}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" label={tr.common.loading} />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<Tags className="h-6 w-6" />}
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
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Tags className="h-6 w-6" />}
          title={tr.categories.emptyTitle}
          description={tr.categories.emptyBody}
          action={
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
              {tr.categories.add}
            </Button>
          }
        />
      ) : (
        <Card padding="none">
          <ul>
            {categories.map((cat) => {
              const Icon = categoryIcon(cat.icon);
              const color = categoryColor(cat.color);
              return (
                <li
                  key={cat.id}
                  className="flex items-center gap-3 border-t border-[var(--border)] px-3 py-2.5 first:border-t-0"
                >
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: color.soft, color: color.on }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.97rem] text-[var(--text)]">
                        {cat.name}
                      </span>
                      {cat.is_default ? (
                        <span className="text-xs text-[var(--muted)]">
                          {tr.categories.defaultBadge}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  <IconButton
                    label={tr.common.delete}
                    icon={<Trash2 className="h-4 w-4" />}
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleting(cat)}
                    className="text-[var(--muted)]"
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <CategoryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        category={editing}
        groupId={currentGroupId}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={tr.categories.deleteTitle}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {tr.common.cancel}
            </Button>
            <Button
              variant="danger"
              loading={deleteCategory.isPending}
              onClick={() => {
                if (!deleting) return;
                deleteCategory.mutate(deleting.id, {
                  onSuccess: () => setDeleting(null),
                });
              }}
            >
              {tr.common.delete}
            </Button>
          </>
        }
      >
        <p className="py-2 text-[0.97rem] text-[var(--text)]">{tr.categories.deleteConfirm}</p>
      </Modal>
    </div>
  );
}

/** Kategori olustur/duzenle sheet'i: ad + renk + ikon. */
function CategoryForm({
  open,
  onClose,
  category,
  groupId,
}: {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  groupId: string | null;
}) {
  const isEdit = Boolean(category);
  const create = useCreateCategory(groupId);
  const update = useUpdateCategory(groupId);

  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [icon, setIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setColor(category?.color ?? DEFAULT_CATEGORY_COLOR);
    setIcon(category?.icon ?? DEFAULT_CATEGORY_ICON);
    setError(null);
  }, [open, category]);

  const saving = create.isPending || update.isPending;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(tr.errors.validation);
      return;
    }
    setError(null);
    const payload: CategoryInput = { name: trimmed, color, icon };
    const onDone = { onSuccess: () => onClose() };
    if (isEdit && category) {
      update.mutate({ id: category.id, ...payload }, onDone);
    } else {
      create.mutate(payload, onDone);
    }
  };

  const SelectedIcon = categoryIcon(icon);
  const selectedColor = categoryColor(color);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? tr.categories.edit : tr.categories.add}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {tr.common.cancel}
          </Button>
          <Button onClick={submit} loading={saving}>
            {saving ? tr.common.saving : tr.common.save}
          </Button>
        </>
      }
    >
      <div className="space-y-5 py-1">
        {/* Onizleme */}
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: selectedColor.soft, color: selectedColor.on }}
          >
            <SelectedIcon className="h-6 w-6" />
          </span>
          <span className="text-[0.97rem] text-[var(--muted)]">
            {name.trim() || tr.categories.namePlaceholder}
          </span>
        </div>

        <Input
          label={tr.categories.nameLabel}
          placeholder={tr.categories.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error ?? undefined}
          autoFocus
          maxLength={60}
          enterKeyHint="done"
        />

        {/* Renk */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-[var(--text)]">{tr.categories.colorLabel}</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setColor(c.key)}
                aria-label={c.key}
                aria-pressed={color === c.key}
                className={cn(
                  'h-9 w-9 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
                  color === c.key && 'ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--surface)]',
                )}
                style={{ backgroundColor: c.dot }}
              />
            ))}
          </div>
        </div>

        {/* Ikon */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-[var(--text)]">{tr.categories.iconLabel}</span>
          <div className="grid grid-cols-7 gap-2">
            {CATEGORY_ICON_NAMES.map((iconName) => {
              const Icon = categoryIcon(iconName);
              const active = icon === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  aria-label={iconName}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex aspect-square items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                    active
                      ? 'border-[var(--primary)] bg-[var(--surface-2)] text-[var(--text)]'
                      : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
