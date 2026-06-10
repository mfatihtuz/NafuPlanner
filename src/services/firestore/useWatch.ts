import { useEffect, useState } from 'react';

/**
 * Anahtar bazlı canlı dinleme hook'u. `subscribe` modül seviyesinde sabit bir
 * fonksiyon olmalıdır. Dönen değer: `null` = yükleniyor / anahtar yok.
 *
 * Veri anahtarla birlikte saklanır; anahtar değişiminde eski veri otomatik
 * geçersizleşir (render sırasında setState gerekmez).
 */
export function useWatch<T>(
  key: string | null | undefined,
  subscribe: (key: string, callback: (data: T) => void) => () => void,
): T | null {
  const [state, setState] = useState<{ key: string; data: T } | null>(null);

  useEffect(() => {
    if (!key) return;
    return subscribe(key, (data) => setState({ key, data }));
  }, [key, subscribe]);

  return state && state.key === key ? state.data : null;
}
