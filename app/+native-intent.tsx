/**
 * Gelen derin bağlantıları (deep link) uygulama rotasına normalize eder.
 *
 * Widget her dokunuşta `nafu:///today` açar; uygulamada "today" adında bir dosya
 * yok (Bugün sekmesi varsayılan kök rotadır). Burada `today` (her biçimi) köke
 * (`/`) yönlendirilir → app/index.tsx → /(app) → (tabs) → Bugün. Diğer derin
 * bağlantılar (ör. task/123) olduğu gibi geçer.
 *
 * Not: redirectSystemPath oturum durumuna erişemez; auth yönlendirmesi
 * AuthGate'te yapılır. Bugün varsayılan iniş rotası olduğu için authlı kullanıcı
 * widget'tan açınca zaten Bugün'e düşer.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  // 'nafu://' şemasını ve baştaki eğik çizgileri at → 'today' | '' | 'task/123'
  const normalized = path
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/^\/+/, '')
    .toLowerCase();
  if (normalized === '' || normalized === 'today') return '/';
  return path;
}
