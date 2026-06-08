import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  useAddShopping,
  useClearCheckedShopping,
  useDeleteShopping,
  useShopping,
  useToggleShopping,
} from '@/features/shopping/useShopping';
import { tr } from '@/i18n/tr';
import {
  Button,
  Checkbox,
  EmptyState,
  IconButton,
  Input,
  Modal,
  Spinner,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ShoppingItem } from '@/types/api';

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem;
  onToggle: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 shadow-subtle"
    >
      <Checkbox
        checked={item.checked}
        onChange={() => onToggle(item)}
        label={
          <span className="flex flex-col">
            <span
              className={cn(
                'text-[0.97rem] text-[var(--text)]',
                item.checked && 'text-[var(--muted)] line-through',
              )}
            >
              {item.name}
            </span>
            {item.quantity ? (
              <span className="text-xs text-[var(--muted)]">{item.quantity}</span>
            ) : null}
          </span>
        }
        className="min-w-0 flex-1 py-1.5"
      />
      <IconButton
        label={tr.shopping.remove}
        icon={<X className="h-4 w-4" />}
        variant="ghost"
        size="sm"
        onClick={() => onDelete(item)}
        className="text-[var(--muted)]"
      />
    </motion.li>
  );
}

export function ShoppingPage() {
  const { currentGroupId } = useAuth();
  const { data, isLoading, isError, refetch } = useShopping(currentGroupId);
  const toggle = useToggleShopping(currentGroupId);
  const add = useAddShopping(currentGroupId);
  const remove = useDeleteShopping(currentGroupId);
  const clearChecked = useClearCheckedShopping(currentGroupId);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const { toBuy, inCart } = useMemo(() => {
    const items = data ?? [];
    return {
      toBuy: items.filter((i) => !i.checked),
      inCart: items.filter((i) => i.checked),
    };
  }, [data]);

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    add.mutate(
      { name: trimmed, quantity: quantity.trim() || null },
      {
        onSuccess: () => {
          setName('');
          setQuantity('');
        },
      },
    );
  };

  const handleToggle = (item: ShoppingItem) => toggle.mutate(item);
  const handleDelete = (item: ShoppingItem) => remove.mutate(item.id);
  const isEmpty = !isLoading && !isError && (data?.length ?? 0) === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[var(--heading)]">{tr.shopping.title}</h1>
        {inCart.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => setConfirmClear(true)}
            className="text-[var(--muted)]"
          >
            {tr.shopping.clearChecked}
          </Button>
        ) : null}
      </div>

      <form onSubmit={onAdd} className="space-y-2">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              placeholder={tr.shopping.itemPlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              enterKeyHint="done"
              aria-label={tr.shopping.addItem}
            />
          </div>
          <div className="w-28">
            <Input
              placeholder={tr.shopping.quantityPlaceholder}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              enterKeyHint="done"
              aria-label={tr.shopping.quantityLabel}
            />
          </div>
          <Button
            type="submit"
            size="md"
            loading={add.isPending}
            aria-label={tr.shopping.addItem}
            className="px-3"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" label={tr.common.loading} />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
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
      ) : isEmpty ? (
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          title={tr.shopping.emptyTitle}
          description={tr.shopping.emptyBody}
        />
      ) : (
        <div className="space-y-5">
          {toBuy.length > 0 ? (
            <section className="space-y-2">
              <h2 className="px-1 text-sm font-semibold text-[var(--muted)]">
                {tr.shopping.toBuy}
              </h2>
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {toBuy.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ) : null}

          {inCart.length > 0 ? (
            <section className="space-y-2">
              <h2 className="px-1 text-sm font-semibold text-[var(--muted)]">
                {tr.shopping.inCart}
              </h2>
              <ul className="space-y-2 opacity-80">
                <AnimatePresence initial={false}>
                  {inCart.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ) : null}
        </div>
      )}

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={tr.shopping.clearChecked}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              {tr.common.cancel}
            </Button>
            <Button
              variant="danger"
              loading={clearChecked.isPending}
              onClick={() =>
                clearChecked.mutate(
                  inCart.map((i) => i.id),
                  { onSuccess: () => setConfirmClear(false) },
                )
              }
            >
              {tr.common.delete}
            </Button>
          </>
        }
      >
        <p className="py-2 text-[0.97rem] text-[var(--text)]">
          {tr.shopping.clearCheckedConfirm}
        </p>
      </Modal>
    </div>
  );
}
