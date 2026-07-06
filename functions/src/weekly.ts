/**
 * Haftalık sistem ödülü — src/domain/systemRewards.ts ile AYNI mantık.
 * Cloud Functions ayrı bir paket olduğundan (RN kaynağını içe alamaz) küçük
 * saf parçalar burada kopyalanır. Değişirse iki tarafı da güncelle.
 */
const DAY = 86_400_000;
const WEEK = 7 * DAY;
const FIRST_MONDAY = 4 * DAY; // 1970-01-05 (ilk Pazartesi)

export function weekIndexUtc(now: number): number {
  return Math.floor((now - FIRST_MONDAY) / WEEK);
}

export const WEEKLY_SYSTEM_REWARDS: ReadonlyArray<{ title: string; costPoints: number }> = [
  { title: 'Akşam filmini bu hafta sen seç 🎬', costPoints: 150 },
  { title: 'Hafta sonu kahvaltısını eşin hazırlasın ☕', costPoints: 220 },
  { title: 'Bir sabah 1 saat fazla uyku — ev işleri beklesin 😴', costPoints: 200 },
  { title: 'Bu hafta menüyü tamamen sen belirle 🍝', costPoints: 180 },
  { title: 'Eşinden 15 dakikalık masaj hakkı 💆', costPoints: 240 },
  { title: 'En sevdiğin tatlı ısmarlansın 🍰', costPoints: 160 },
  { title: 'Bir akşam bulaşık & toplama tamamen affedildi 🧽', costPoints: 200 },
  { title: 'TV kumandası bütün akşam senin 📺', costPoints: 150 },
  { title: 'Bir ev işini "bu hafta yapmıyorum" deme hakkı 🙅', costPoints: 250 },
  { title: 'Sürpriz küçük hediye — eşin seçsin 🎁', costPoints: 230 },
  { title: 'Oyun/dizi gecesi: kurallar sende 🎮', costPoints: 170 },
  { title: 'Bir öğle/akşam yemeği dışarıda, hesap eşine 🍽️', costPoints: 250 },
];

export function weeklyRewardFor(now: number): { id: string; title: string; costPoints: number } {
  const wi = weekIndexUtc(now);
  const len = WEEKLY_SYSTEM_REWARDS.length;
  const tpl = WEEKLY_SYSTEM_REWARDS[((wi % len) + len) % len];
  return { id: `system-w${wi}`, title: tpl.title, costPoints: tpl.costPoints };
}
