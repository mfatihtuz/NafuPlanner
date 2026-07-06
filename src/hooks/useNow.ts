import { useState } from 'react';

/**
 * Render saflığını koruyarak "şu an" değeri verir: bileşen mount olduğunda
 * bir kez sabitlenir. Liste gruplama/tarih etiketi gibi gösterim amaçlı
 * kullanımlar için yeterlidir.
 */
export function useNow(): number {
  const [now] = useState(() => Date.now());
  return now;
}
