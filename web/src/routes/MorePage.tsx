import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity as ActivityIcon,
  ChevronRight,
  LogOut,
  Tags,
  UserPlus,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme, type Theme } from '@/providers/ThemeProvider';
import { useMembers } from '@/features/groups/useGroupData';
import { InviteSheet } from '@/features/groups/InviteSheet';
import { cn } from '@/lib/cn';
import { tr } from '@/i18n/tr';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Modal,
  SegmentedControl,
  Spinner,
  type SegmentOption,
} from '@/components/ui';

const themeOptions: SegmentOption<Theme>[] = [
  { value: 'system', label: tr.settings.themeSystem },
  { value: 'light', label: tr.settings.themeLight },
  { value: 'dark', label: tr.settings.themeDark },
];

/** Grup uyelerini listeleyen kart. */
function MembersCard({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const { data, isLoading } = useMembers(groupId);
  const members = data ?? [];

  return (
    <Card padding="none">
      <div className="flex items-center gap-2 px-4 pb-1 pt-3">
        <Users className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-[var(--muted)]">{tr.groups.members}</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner className="h-5 w-5" />
        </div>
      ) : members.length === 0 ? (
        <p className="px-4 py-4 text-sm text-[var(--muted)]">{tr.groups.emptyMembers}</p>
      ) : (
        <ul>
          {members.map((member) => {
            const name = member.display_name ?? member.user?.name ?? '';
            const isSelf = member.user_id === user?.id;
            return (
              <li
                key={member.id}
                className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-2.5 first:border-t-0"
              >
                <Avatar name={name} src={member.user?.avatar_url} size="sm" />
                <span className="flex-1 truncate text-[0.95rem] text-[var(--text)]">
                  {name}
                  {isSelf ? <span className="text-[var(--muted)]"> ({tr.common.you})</span> : null}
                </span>
                <Chip tone={member.role === 'owner' ? 'accent' : 'neutral'}>
                  {member.role === 'owner' ? tr.groups.owner : tr.groups.member}
                </Chip>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Yonetim baglantisi satiri (kategoriler, akis). */
function NavRow({
  icon: Icon,
  label,
  onClick,
  first,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  first?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface-2)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]',
        !first && 'border-t border-[var(--border)]',
      )}
    >
      <Icon className="h-5 w-5 text-[var(--muted)]" aria-hidden="true" />
      <span className="flex-1 text-[0.97rem] text-[var(--text)]">{label}</span>
      <ChevronRight className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
    </button>
  );
}

export function MorePage() {
  const navigate = useNavigate();
  const { user, currentGroup, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [confirmOut, setConfirmOut] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-[var(--heading)]">{tr.nav.daha}</h1>

      {/* Profil */}
      {user ? (
        <Card padding="md">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} src={user.avatar_url} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--text)]">{user.name}</p>
              <p className="truncate text-sm text-[var(--muted)]">{user.email}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Gorunum */}
      <Card padding="md" className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--muted)]">{tr.settings.appearance}</h2>
        <SegmentedControl
          options={themeOptions}
          value={theme}
          onChange={setTheme}
          ariaLabel={tr.settings.theme}
        />
      </Card>

      {/* Yonetim */}
      {currentGroup ? (
        <div className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-[var(--muted)]">{tr.more.manage}</h2>
          <Card padding="none" className="overflow-hidden">
            <NavRow
              first
              icon={Tags}
              label={tr.more.categories}
              onClick={() => navigate('/kategoriler')}
            />
            <NavRow
              icon={ActivityIcon}
              label={tr.more.activity}
              onClick={() => navigate('/akis')}
            />
          </Card>
        </div>
      ) : null}

      {/* Uyeler */}
      {currentGroup ? <MembersCard groupId={currentGroup.id} /> : null}

      {/* Davet */}
      {currentGroup ? (
        <Button
          variant="secondary"
          block
          size="lg"
          leftIcon={<UserPlus className="h-5 w-5" />}
          onClick={() => setInviteOpen(true)}
        >
          {tr.groups.invite}
        </Button>
      ) : null}

      {/* Cikis */}
      <Button
        variant="ghost"
        block
        size="lg"
        leftIcon={<LogOut className="h-5 w-5" />}
        className="text-red-500"
        onClick={() => setConfirmOut(true)}
      >
        {tr.auth.signOut}
      </Button>

      <InviteSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        groupId={currentGroup?.id ?? null}
        groupName={currentGroup?.name}
      />

      <Modal
        open={confirmOut}
        onClose={() => setConfirmOut(false)}
        title={tr.auth.signOut}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOut(false)}>
              {tr.common.cancel}
            </Button>
            <Button variant="danger" onClick={() => void signOut()}>
              {tr.auth.signOut}
            </Button>
          </>
        }
      >
        <p className="py-2 text-[0.97rem] text-[var(--text)]">{tr.auth.signOutConfirm}</p>
      </Modal>
    </div>
  );
}
