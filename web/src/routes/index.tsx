import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui';
import { tr } from '@/i18n/tr';

/** Tam ekran yukleme durumu (ilk acilis / oturum cozumlenirken). */
export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)]">
      <Spinner className="h-8 w-8" label={tr.common.loading} />
    </div>
  );
}

/**
 * Korumali alan: oturum yoksa girise yonlendirir, grup yoksa grup olusturmaya.
 * Aksi halde uygulama kabugu icinde alt rotalari (Outlet) gosterir.
 */
export function ProtectedLayout() {
  const { isLoading, user, groups } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;

  if (!user) {
    return <Navigate to="/giris" replace state={{ from: location.pathname }} />;
  }

  if (groups.length === 0) {
    return <Navigate to="/grup/yeni" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

/** Girise/grup olusturmaya zaten oturumluyken gelindiyse uygulamaya don. */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Yalnizca oturum gerektirir (grup sart degil). Grup olusturma ekrani icin. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/giris" replace />;
  return <>{children}</>;
}
