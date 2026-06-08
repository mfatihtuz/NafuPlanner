import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LinkIcon, TriangleAlert, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { tr } from '@/i18n/tr';
import { Button, Card, EmptyState, Spinner } from '@/components/ui';
import type { Group, InvitationPreview } from '@/types/api';

/** /davet/:token — davet onizleme ve kabul ekrani. */
export function InviteAcceptPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, refresh, setCurrentGroupId } = useAuth();

  const preview = useQuery<InvitationPreview>({
    queryKey: ['invitation', token],
    queryFn: ({ signal }) =>
      api.get<InvitationPreview>(`/invitations/${token}`, { signal }),
    enabled: Boolean(token),
    retry: false,
  });

  const accept = useMutation({
    mutationFn: () => api.post<Group>(`/invitations/${token}/accept`),
    onSuccess: async (group) => {
      await refresh();
      if (group?.id) setCurrentGroupId(group.id);
      navigate('/', { replace: true });
    },
  });

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)] px-6 pb-safe pt-safe">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-12">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-contrast)] shadow-card">
          <LinkIcon className="h-6 w-6" aria-hidden="true" />
        </span>

        {preview.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-7 w-7" label={tr.common.loading} />
          </div>
        ) : preview.isError || !preview.data ? (
          <EmptyState
            icon={<TriangleAlert className="h-6 w-6" />}
            title={tr.invite.invalidTitle}
            description={tr.invite.invalidBody}
            action={
              <Button variant="secondary" onClick={() => navigate('/')}>
                {tr.common.back}
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-[var(--heading)]">
                {tr.invite.previewTitle(preview.data.group_name)}
              </h1>
              <p className="text-[0.97rem] leading-relaxed text-[var(--muted)]">
                {tr.invite.previewSubtitle}
              </p>
            </div>

            {typeof preview.data.member_count === 'number' ? (
              <Card padding="md">
                <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <Users className="h-5 w-5" aria-hidden="true" />
                  <span>{preview.data.member_count}</span>
                </div>
              </Card>
            ) : null}

            {user ? (
              <div className="space-y-3">
                <Button
                  size="lg"
                  block
                  loading={accept.isPending}
                  onClick={() => accept.mutate()}
                >
                  {accept.isPending ? tr.invite.accepting : tr.invite.accept}
                </Button>
                <Button variant="ghost" block onClick={() => navigate('/')}>
                  {tr.invite.decline}
                </Button>
                {accept.isError ? (
                  <p className="text-center text-sm text-red-500">{tr.errors.generic}</p>
                ) : null}
              </div>
            ) : (
              <Card padding="md" className="bg-[var(--surface-2)]">
                <p className="text-sm text-[var(--text)]">{tr.invite.needSignIn}</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
