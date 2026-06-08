import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';

/**
 * Uygulama geneli QueryClient. Mobil/PWA icin makul varsayilanlar:
 *  - kisa sure taze tutar (staleTime), boylece sekme degisiminde gereksiz cagri olmaz
 *  - 401/403/404 gibi anlamsiz tekrarlardan kacinir
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          // Istemci kaynakli hatalarda tekrar denemek anlamsiz.
          if ([400, 401, 403, 404, 409, 422].includes(error.status)) {
            return false;
          }
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
