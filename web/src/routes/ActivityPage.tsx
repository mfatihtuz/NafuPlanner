import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity as ActivityIcon,
  CheckCircle2,
  ChevronLeft,
  MessageSquare,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useActivity } from '@/features/activity/useActivity';
import { tr } from '@/i18n/tr';
import { formatRelativeTime } from '@/lib/datetime';
import { Avatar, Button, Card, EmptyState, IconButton, Spinner } from '@/components/ui';
import type { Activity } from '@/types/api';

/** Eylem kodunu Turkce ifadeye ve bir ikona esler. */
function describeAction(action: string): { text: string; icon: LucideIcon } {
  switch (action) {
    case 'task_created':
      return { text: tr.activity.taskCreated, icon: Plus };
    case 'task_completed':
      return { text: tr.activity.taskCompleted, icon: CheckCircle2 };
    case 'task_updated':
      return { text: tr.activity.taskUpdated, icon: Pencil };
    case 'task_deleted':
      return { text: tr.activity.taskDeleted, icon: Trash2 };
    case 'comment_added':
      return { text: tr.activity.commentAdded, icon: MessageSquare };
    case 'shopping_added':
    case 'shopping_item_added':
      return { text: tr.activity.shoppingAdded, icon: ShoppingCart };
    case 'shopping_checked':
    case 'shopping_item_checked':
      return { text: tr.activity.shoppingChecked, icon: ShoppingCart };
    case 'member_joined':
      return { text: tr.activity.memberJoined, icon: UserPlus };
    default:
      return { text: tr.activity.generic, icon: ActivityIcon };
  }
}

function ActivityRow({ item }: { item: Activity }) {
  const actorName = item.actor?.name ?? tr.activity.someone;
  const { text, icon: Icon } = describeAction(item.action);

  return (
    <li className="flex items-start gap-3 border-t border-[var(--border)] px-4 py-3 first:border-t-0">
      <span className="relative mt-0.5 shrink-0">
        <Avatar name={actorName} src={item.actor?.avatar_url} size="sm" />
        <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)]">
          <Icon className="h-3 w-3" aria-hidden="true" />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.95rem] leading-snug text-[var(--text)]">
          {/* Sunucu ozeti varsa onu kullan; yoksa aktor + eylem ifadesi. */}
          {item.summary ? (
            item.summary
          ) : (
            <>
              <span className="font-medium">{actorName}</span> {text}
            </>
          )}
        </p>
        <span className="text-xs text-[var(--muted)]">
          {formatRelativeTime(item.created_at)}
        </span>
      </div>
    </li>
  );
}

export function ActivityPage() {
  const navigate = useNavigate();
  const { currentGroupId } = useAuth();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useActivity(currentGroupId);

  const items = useMemo(() => data?.pages.flat() ?? [], [data]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <IconButton
          label={tr.common.back}
          icon={<ChevronLeft className="h-5 w-5" />}
          onClick={() => navigate(-1)}
        />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-[var(--heading)]">{tr.activity.title}</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" label={tr.common.loading} />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<ActivityIcon className="h-6 w-6" />}
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
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ActivityIcon className="h-6 w-6" />}
          title={tr.activity.emptyTitle}
          description={tr.activity.emptyBody}
        />
      ) : (
        <>
          <Card padding="none">
            <ul>
              {items.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </ul>
          </Card>

          {hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                onClick={() => void fetchNextPage()}
                loading={isFetchingNextPage}
              >
                {tr.activity.loadMore}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
