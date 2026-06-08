import { useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { tr } from '@/i18n/tr';
import { Modal } from '@/components/ui';
import { cn } from '@/lib/cn';

/** Ust bardaki grup adi; dokununca grup secim sheet'i acilir. */
export function GroupSwitcher() {
  const { groups, currentGroup, currentGroupId, setCurrentGroupId } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const title = currentGroup?.name ?? tr.common.appName;
  const multiple = groups.length > 1;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex max-w-[60vw] items-center gap-1.5 rounded-full px-2 py-1 text-left',
          'transition-colors duration-150 hover:bg-[var(--surface-2)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        )}
        aria-label={tr.groups.switchGroup}
      >
        <span className="truncate text-lg font-semibold text-[var(--heading)]">{title}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={tr.groups.switchGroup}>
        <ul className="flex flex-col gap-1 pb-2">
          {groups.map((group) => {
            const active = group.id === currentGroupId;
            return (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentGroupId(group.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl px-3 text-left',
                    'transition-colors duration-150 hover:bg-[var(--surface-2)]',
                    active && 'bg-[var(--surface-2)]',
                  )}
                >
                  <span className="truncate font-medium text-[var(--text)]">{group.name}</span>
                  {active ? (
                    <Check className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            navigate('/grup/yeni');
          }}
          className={cn(
            'flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-3 text-left',
            'text-[var(--primary)] transition-colors duration-150 hover:bg-[var(--surface-2)]',
          )}
        >
          <Plus className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="font-medium">{tr.groups.create}</span>
        </button>

        {!multiple ? (
          <p className="px-3 pb-1 pt-2 text-xs text-[var(--muted)]">
            {tr.groups.emptyMembers}
          </p>
        ) : null}
      </Modal>
    </>
  );
}
