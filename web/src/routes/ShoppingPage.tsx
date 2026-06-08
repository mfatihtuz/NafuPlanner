import { useMemo, useState, type FormEvent } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  useAddShopping,
  useShopping,
  useToggleShopping,
} from '@/features/shopping/useShopping';
import { tr } from '@/i18n/tr';
import { Button, Card, Checkbox, EmptyState, Input, Spinner } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ShoppingItem } from '@/types/api';

function ItemRow({
  item,
  onToggle,
}: {
  item: ShoppingItem;
  onToggle: (item: ShoppingItem) => void;
}) {
  return (
    <li>
      <Card padding="none" className="px-3 py-1">
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
          className="w-full"
        />
      </Card>
    </li>
  );
}

export function ShoppingPage() {
  const { currentGroupId } = useAuth();
  const { data, isLoading, isError, refetch } = useShopping(currentGroupId);
  const toggle = useToggleShopping(currentGroupId);
  const add = useAddShopping(currentGroupId);
  const [name, setName] = useState('');

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
    add.mutate(trimmed, { onSuccess: () => setName('') });
  };

  const handleToggle = (item: ShoppingItem) => toggle.mutate(item);
  const isEmpty = !isLoading && !isError && (data?.length ?? 0) === 0;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-[var(--heading)]">{tr.shopping.title}</h1>

      <form onSubmit={onAdd} className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            placeholder={tr.shopping.itemPlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            enterKeyHint="done"
            aria-label={tr.shopping.addItem}
          />
        </div>
        <Button
          type="submit"
          size="md"
          loading={add.isPending}
          aria-label={tr.shopping.addItem}
          leftIcon={<Plus className="h-5 w-5" />}
        >
          {tr.common.add}
        </Button>
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
                {toBuy.map((item) => (
                  <ItemRow key={item.id} item={item} onToggle={handleToggle} />
                ))}
              </ul>
            </section>
          ) : null}

          {inCart.length > 0 ? (
            <section className="space-y-2">
              <h2 className="px-1 text-sm font-semibold text-[var(--muted)]">
                {tr.shopping.inCart}
              </h2>
              <ul className="space-y-2 opacity-80">
                {inCart.map((item) => (
                  <ItemRow key={item.id} item={item} onToggle={handleToggle} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
