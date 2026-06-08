import { useEffect, useRef, useState } from 'react';
import { Check, Copy, RefreshCw, Share2 } from 'lucide-react';
import { useCreateInvitation } from '@/features/groups/useGroupData';
import { tr } from '@/i18n/tr';
import { Button, Modal, Spinner } from '@/components/ui';
import type { InvitationCreated } from '@/types/api';

interface InviteSheetProps {
  open: boolean;
  onClose: () => void;
  groupId: string | null;
  groupName?: string;
}

/**
 * Davet sheet'i: acilinca bir davet baglantisi olusturur, kopyalanabilir link
 * ve (destekleniyorsa) sistem paylasimini sunar.
 */
export function InviteSheet({ open, onClose, groupId, groupName }: InviteSheetProps) {
  const create = useCreateInvitation(groupId);
  const [invitation, setInvitation] = useState<InvitationCreated | null>(null);
  const [copied, setCopied] = useState(false);
  // Ayni acilista (ve StrictMode cift efektinde) tek davet uretmek icin kilit.
  const requestedRef = useRef(false);

  // Sheet acildiginda bir kez taze baglanti uret; kapaninca durumu sifirla.
  useEffect(() => {
    if (!open) {
      requestedRef.current = false;
      return;
    }
    if (!groupId || requestedRef.current) return;
    requestedRef.current = true;
    setInvitation(null);
    setCopied(false);
    create.mutate(undefined, { onSuccess: (data) => setInvitation(data) });
    // create yalniz acilista cagrilmali; bagimliliklara create eklemiyoruz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groupId]);

  const url = invitation?.url ?? '';

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Pano erisilemezse kullanici metni elle secebilir.
    }
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const handleShare = async () => {
    if (!url) return;
    try {
      await navigator.share({
        title: tr.common.appName,
        text: groupName ? tr.invite.previewTitle(groupName) : tr.groups.inviteTitle,
        url,
      });
    } catch {
      // Kullanici paylasimi iptal etmis olabilir; sessiz gec.
    }
  };

  const regenerate = () => {
    if (!groupId) return;
    setInvitation(null);
    setCopied(false);
    create.mutate(undefined, { onSuccess: (data) => setInvitation(data) });
  };

  return (
    <Modal open={open} onClose={onClose} title={tr.groups.inviteTitle}>
      <div className="space-y-4 py-1">
        <p className="text-[0.95rem] leading-relaxed text-[var(--muted)]">
          {tr.groups.inviteSubtitle}
        </p>

        {create.isPending && !invitation ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" label={tr.common.loading} />
          </div>
        ) : create.isError && !invitation ? (
          <div className="space-y-3">
            <p className="text-sm text-red-500">{tr.groups.inviteCreateFailed}</p>
            <Button variant="secondary" block onClick={regenerate}>
              {tr.common.retry}
            </Button>
          </div>
        ) : invitation ? (
          <>
            {/* Baglanti kutusu */}
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]" dir="ltr">
                {url}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? tr.common.copied : tr.groups.copyLink}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-[var(--primary)]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                block={!canShare}
                leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                onClick={handleCopy}
                className={canShare ? 'flex-1' : undefined}
              >
                {copied ? tr.common.copied : tr.groups.copyLink}
              </Button>
              {canShare ? (
                <Button
                  variant="secondary"
                  leftIcon={<Share2 className="h-4 w-4" />}
                  onClick={handleShare}
                  className="flex-1"
                >
                  {tr.common.share}
                </Button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={regenerate}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {tr.groups.newLink}
            </button>

            <p className="text-xs text-[var(--muted)]">{tr.groups.inviteHint}</p>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
