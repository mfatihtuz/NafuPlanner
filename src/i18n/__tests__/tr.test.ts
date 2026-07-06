import { tr } from '@/i18n/tr';

describe('i18n sözlüğü', () => {
  // t() yalnız {{ad}} biçimini değiştirir; tek süslü {ad} ham görünür
  // (kullanıcı bildirimde "{name}" gördü). Sözlükte tek süslü yer tutucu
  // kalmadığını garanti eder.
  it('tüm yer tutucular çift süslü ({{ad}}) yazılmalı', () => {
    const offenders = Object.entries(tr)
      .filter(([, value]) => /(?<!\{)\{[a-zA-Z]+\}(?!\})/.test(value))
      .map(([key, value]) => `${key}: ${value}`);
    expect(offenders).toEqual([]);
  });
});
