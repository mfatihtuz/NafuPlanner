import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { AppConfig, AuthResponse, Group, MeResponse, User } from '@/types/api';
import type { GoogleCredentialResponse } from '@/types/google';

// Derleme aninda env ile gomulebilir; gomulmediyse sunucudan (acik /api/config)
// calisma aninda okunur. Boylece tek config dosyasi (config.php) yeterli olur.
const BUILD_TIME_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const CURRENT_GROUP_KEY = 'np-current-group';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

export const meQueryKey = ['me'] as const;

interface AuthContextValue {
  /** Oturum durumu yuklenirken true (ilk acilis). */
  isLoading: boolean;
  /** Giris yapmis kullanici, yoksa null. */
  user: User | null;
  groups: Group[];
  currentGroupId: string | null;
  currentGroup: Group | null;
  setCurrentGroupId: (id: string) => void;
  /** Google client id tanimli mi (giris ekraninda not gostermek icin). */
  isGoogleConfigured: boolean;
  /** Acik yapilandirma (client id) sunucudan henuz yukleniyor mu. */
  isAuthConfigLoading: boolean;
  /** Google ile giris akisini baslatir (One Tap / popup). */
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
  /** /api/me'yi yeniden ceker (davet kabulu sonrasi vb.). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** GIS betigini bir kez yukler. */
function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('gsi')));
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('gsi'));
    document.head.appendChild(script);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const gsiInitialized = useRef(false);

  // Google Client ID: derleme env'i varsa onu kullan; yoksa sunucudan oku.
  const configQuery = useQuery<AppConfig>({
    queryKey: ['app-config'],
    queryFn: ({ signal }) => api.get<AppConfig>('/config', { signal }),
    enabled: !BUILD_TIME_CLIENT_ID,
    staleTime: Infinity,
    retry: 1,
  });
  const clientId =
    BUILD_TIME_CLIENT_ID ?? configQuery.data?.google_client_id ?? undefined;
  const isGoogleConfigured = Boolean(clientId);
  const isAuthConfigLoading = !BUILD_TIME_CLIENT_ID && configQuery.isLoading;

  const [currentGroupId, setCurrentGroupIdState] = useState<string | null>(() => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(CURRENT_GROUP_KEY);
  });

  const meQuery = useQuery<MeResponse>({
    queryKey: meQueryKey,
    queryFn: ({ signal }) => api.get<MeResponse>('/me', { signal }),
    // 401 -> giris yapilmamis; kullaniciyi null kabul edip hatayi yutariz.
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 401) && count < 1,
    staleTime: 60_000,
  });

  const user = meQuery.data?.user ?? null;
  const groups = useMemo(() => meQuery.data?.groups ?? [], [meQuery.data]);

  // Gecerli grup secimini grup listesiyle uyumlu tut.
  useEffect(() => {
    if (groups.length === 0) return;
    const stillValid =
      currentGroupId && groups.some((g) => g.id === currentGroupId);
    if (!stillValid) {
      setCurrentGroupIdState(groups[0].id);
    }
  }, [groups, currentGroupId]);

  const setCurrentGroupId = useCallback((id: string) => {
    setCurrentGroupIdState(id);
    try {
      localStorage.setItem(CURRENT_GROUP_KEY, id);
    } catch {
      // sessizce gec
    }
  }, []);

  const currentGroup = useMemo(
    () => groups.find((g) => g.id === currentGroupId) ?? null,
    [groups, currentGroupId],
  );

  // Google kimlik dogrulama yaniti -> sunucuya gonder -> /api/me tazele.
  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      try {
        await api.post<AuthResponse>('/auth/google', {
          id_token: response.credential,
        });
        await queryClient.invalidateQueries({ queryKey: meQueryKey });
      } catch {
        // Hata gosterimi giris ekraninda ele alinir; burada sessiz kaliriz.
      }
    },
    [queryClient],
  );

  const signInWithGoogle = useCallback(() => {
    if (!clientId) return;
    void (async () => {
      await loadGoogleScript();
      const idApi = window.google?.accounts.id;
      if (!idApi) return;
      if (!gsiInitialized.current) {
        idApi.initialize({
          client_id: clientId,
          callback: (resp) => void handleCredential(resp),
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: true,
        });
        gsiInitialized.current = true;
      }
      idApi.prompt();
    })();
  }, [handleCredential, clientId]);

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Cikis her durumda yerelde uygulanir.
    }
    window.google?.accounts.id.disableAutoSelect();
    try {
      localStorage.removeItem(CURRENT_GROUP_KEY);
    } catch {
      // sessizce gec
    }
    setCurrentGroupIdState(null);
    queryClient.setQueryData(meQueryKey, { user: null, groups: [] });
    await queryClient.invalidateQueries({ queryKey: meQueryKey });
  }, [queryClient]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: meQueryKey });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: meQuery.isLoading,
      user,
      groups,
      currentGroupId,
      currentGroup,
      setCurrentGroupId,
      isGoogleConfigured,
      isAuthConfigLoading,
      signInWithGoogle,
      signOut,
      refresh,
    }),
    [
      meQuery.isLoading,
      user,
      groups,
      currentGroupId,
      currentGroup,
      setCurrentGroupId,
      isGoogleConfigured,
      isAuthConfigLoading,
      signInWithGoogle,
      signOut,
      refresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth yalnizca AuthProvider icinde kullanilabilir.');
  }
  return ctx;
}
