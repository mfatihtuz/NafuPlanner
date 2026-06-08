import { Flame, Star, Trophy } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useBadges, useLeaderboard } from '@/features/gamification/useGamification';
import { BadgeIcon } from '@/features/gamification/BadgeIcon';
import { tr } from '@/i18n/tr';
import { cn } from '@/lib/cn';
import { Avatar, Card, Chip, EmptyState, Spinner } from '@/components/ui';
import type { Badge, LeaderboardRow } from '@/types/api';

/** Sira rozeti rengi (ilk uc). */
function rankClass(rank: number): string {
  if (rank === 1) return 'bg-amber-400/20 text-amber-500';
  if (rank === 2) return 'bg-slate-400/20 text-slate-400';
  if (rank === 3) return 'bg-orange-500/20 text-orange-500';
  return 'bg-[var(--surface-2)] text-[var(--muted)]';
}

/** Senin durumun: ozet kart. */
function StandingCard({ me }: { me: LeaderboardRow }) {
  return (
    <Card padding="md" className="space-y-3">
      <h2 className="text-sm font-semibold text-[var(--muted)]">{tr.game.yourStanding}</h2>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-[var(--surface-2)] py-2.5">
          <p className="text-xl font-bold text-[var(--primary)]">{me.points}</p>
          <p className="text-xs text-[var(--muted)]">{tr.game.pointsLabel}</p>
        </div>
        <div className="rounded-xl bg-[var(--surface-2)] py-2.5">
          <p className="text-xl font-bold text-[var(--text)]">{tr.game.levelShort(me.level)}</p>
          <p className="text-xs text-[var(--muted)]">{tr.game.level}</p>
        </div>
        <div className="rounded-xl bg-[var(--surface-2)] py-2.5">
          <p className="flex items-center justify-center gap-1 text-xl font-bold text-amber-500">
            <Flame className="h-5 w-5" aria-hidden="true" />
            {me.streak_current}
          </p>
          <p className="text-xs text-[var(--muted)]">{tr.game.streak}</p>
        </div>
      </div>
    </Card>
  );
}

/** Katki tablosu satiri. */
function LeaderRow({ row, isSelf }: { row: LeaderboardRow; isSelf: boolean }) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 border-t border-[var(--border)] px-3 py-2.5 first:border-t-0',
        isSelf && 'bg-[var(--surface-2)]',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold',
          rankClass(row.rank),
        )}
      >
        {row.rank}
      </span>
      <Avatar name={row.name} src={row.avatar_url} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.95rem] font-medium text-[var(--text)]">
          {row.name}
          {isSelf ? <span className="text-[var(--muted)]"> ({tr.common.you})</span> : null}
        </p>
        <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <span className="inline-flex items-center gap-0.5">
            <Flame className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            {tr.game.streakDays(row.streak_current)}
          </span>
          <span>·</span>
          <span>{tr.game.tasksDone(row.tasks_completed)}</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[0.95rem] font-bold text-[var(--primary)]">{row.points}</p>
        <p className="text-xs text-[var(--muted)]">{tr.game.levelShort(row.level)}</p>
      </div>
    </li>
  );
}

/** Rozet karti (kazanildi/kilitli + ilerleme). */
function BadgeCard({ badge }: { badge: Badge }) {
  const pct =
    badge.progress !== null && badge.threshold_value > 0
      ? Math.min(100, Math.round((badge.progress / badge.threshold_value) * 100))
      : null;

  return (
    <div
      className={cn(
        'rounded-2xl border p-3 text-center transition-colors',
        badge.earned
          ? 'border-[var(--primary)]/40 bg-[var(--primary)]/10'
          : 'border-[var(--border)] bg-[var(--surface-2)]',
      )}
    >
      <span
        className={cn(
          'mx-auto flex h-11 w-11 items-center justify-center rounded-full',
          badge.earned
            ? 'bg-[var(--primary)] text-[var(--primary-contrast)]'
            : 'bg-[var(--bg)] text-[var(--muted)]',
        )}
      >
        <BadgeIcon name={badge.icon} className="h-6 w-6" />
      </span>
      <p className="mt-2 text-sm font-semibold text-[var(--text)]">{badge.name}</p>
      <p className="mt-0.5 text-xs leading-snug text-[var(--muted)]">{badge.description}</p>

      {badge.earned ? (
        <Chip tone="accent" className="mt-2">
          {tr.game.earned}
        </Chip>
      ) : pct !== null ? (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg)]">
            <div className="h-full rounded-full bg-[var(--primary)]/60" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[0.7rem] text-[var(--muted)]">
            {badge.progress}/{badge.threshold_value}
          </p>
        </div>
      ) : (
        <Chip tone="neutral" className="mt-2">
          {tr.game.locked}
        </Chip>
      )}
    </div>
  );
}

/** Katki tablosu + rozetler ekrani. */
export function LeaderboardPage() {
  const { currentGroup, user } = useAuth();
  const groupId = currentGroup?.id ?? null;
  const leaderboard = useLeaderboard(groupId);
  const badges = useBadges(groupId);

  const rows = leaderboard.data ?? [];
  const me = rows.find((r) => r.user_id === user?.id) ?? null;
  const badgeList = badges.data ?? [];
  const earnedCount = badgeList.filter((b) => b.earned).length;
  const noPoints = rows.length > 0 && rows.every((r) => r.points === 0);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-[var(--heading)]">{tr.game.title}</h1>

      {leaderboard.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6" label={tr.common.loading} />
        </div>
      ) : (
        <>
          {me ? <StandingCard me={me} /> : null}

          {noPoints ? (
            <EmptyState
              icon={<Trophy className="h-7 w-7" aria-hidden="true" />}
              title={tr.game.emptyTitle}
              description={tr.game.emptyBody}
            />
          ) : (
            <Card padding="none" className="overflow-hidden">
              <ul>
                {rows.map((row) => (
                  <LeaderRow key={row.user_id} row={row} isSelf={row.user_id === user?.id} />
                ))}
              </ul>
            </Card>
          )}

          {/* Rozetler */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)]">
                <Star className="h-4 w-4" aria-hidden="true" />
                {tr.game.badges}
              </h2>
              {badgeList.length > 0 ? (
                <span className="text-xs text-[var(--muted)]">
                  {tr.game.badgesEarnedCount(earnedCount, badgeList.length)}
                </span>
              ) : null}
            </div>
            {badges.isLoading ? (
              <div className="flex justify-center py-6">
                <Spinner className="h-5 w-5" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {badgeList.map((b) => (
                  <BadgeCard key={b.code} badge={b} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
