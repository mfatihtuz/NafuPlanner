import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { House } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { tr } from '@/i18n/tr';
import { Button, Card, Input } from '@/components/ui';
import type { Group } from '@/types/api';

/** Ilk grup olusturma (ya da yeni grup ekleme) ekrani. */
export function CreateGroupPage() {
  const navigate = useNavigate();
  const { refresh, setCurrentGroupId } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (groupName: string) =>
      api.post<Group>('/groups', { name: groupName }),
    onSuccess: async (group) => {
      await refresh();
      setCurrentGroupId(group.id);
      navigate('/', { replace: true });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : tr.errors.generic);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(tr.errors.validation);
      return;
    }
    setError(null);
    mutation.mutate(trimmed);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)] px-6 pb-safe pt-safe">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-12">
        <header className="space-y-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-contrast)] shadow-card">
            <House className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-[var(--heading)]">
              {tr.groups.createTitle}
            </h1>
            <p className="text-[0.97rem] leading-relaxed text-[var(--muted)]">
              {tr.groups.createSubtitle}
            </p>
          </div>
        </header>

        <Card padding="lg">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label={tr.groups.nameLabel}
              placeholder={tr.groups.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={error ?? undefined}
              autoFocus
              maxLength={120}
              enterKeyHint="done"
            />
            <Button type="submit" size="lg" block loading={mutation.isPending}>
              {mutation.isPending ? tr.groups.creating : tr.groups.createCta}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
