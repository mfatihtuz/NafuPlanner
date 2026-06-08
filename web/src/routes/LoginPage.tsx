import { useState } from 'react';
import { Sparkles, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { tr } from '@/i18n/tr';
import { Button, Card, Spinner } from '@/components/ui';

/** Google logosu (resmi renkler). Tek kullanimlik oldugu icin yerinde tutulur. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/** Giris ekrani: sicak kahraman metni ve Google girisi. Emoji yok. */
export function LoginPage() {
  const { isGoogleConfigured, isAuthConfigLoading, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleSignIn = () => {
    setBusy(true);
    signInWithGoogle();
    // GIS akisi ayri pencerede; kullanici geri donunce me sorgusu cozulur.
    window.setTimeout(() => setBusy(false), 4000);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)] px-6 pb-safe pt-safe">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-10 py-12">
        <header className="space-y-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-contrast)] shadow-card">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="space-y-2.5">
            <h1 className="text-[1.7rem] font-semibold leading-tight text-[var(--heading)]">
              {tr.auth.heroTitle}
            </h1>
            <p className="text-[0.97rem] leading-relaxed text-[var(--muted)]">
              {tr.auth.heroSubtitle}
            </p>
          </div>
        </header>

        <div className="space-y-3">
          {isAuthConfigLoading ? (
            <div className="flex justify-center py-2">
              <Spinner className="h-6 w-6" label={tr.common.loading} />
            </div>
          ) : isGoogleConfigured ? (
            <>
              <Button
                size="lg"
                variant="secondary"
                block
                loading={busy}
                leftIcon={<GoogleMark />}
                onClick={handleSignIn}
              >
                {busy ? tr.auth.signingIn : tr.auth.continueWithGoogle}
              </Button>
              <p className="text-center text-xs text-[var(--muted)]">{tr.auth.privacyNote}</p>
            </>
          ) : (
            <Card padding="md" className="border-amber-200 bg-amber-50">
              <div className="flex gap-3">
                <TriangleAlert
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-800">
                    {tr.auth.noClientIdTitle}
                  </p>
                  <p className="text-sm leading-relaxed text-amber-700">
                    {tr.auth.noClientIdBody}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
