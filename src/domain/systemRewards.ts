/**
 * Nafu'nun haftalık sistem ödülü — saf mantık (yan etkisiz, test edilebilir).
 *
 * Her hafta tüm hanelerde otomatik beliren, hane içi eğlenceli ve hafif
 * zorlayıcı bir ödül. Puan eşiği bilerek yüksekçedir ki kullanıcı bir hafta
 * boyunca görev yapıp "kapmak" için motive olsun. Sunucusuz mimaride bu ödül,
 * uygulama açılışında deterministik kimlikle (haftaya sabit) idempotent olarak
 * oluşturulur; Cloud Functions gerekmez.
 */
import type { Millis } from './types';

export interface WeeklyRewardTemplate {
  title: string;
  costPoints: number;
}

/**
 * Ödül havuzu (haftaya göre döner). Hepsi hane içi, eğlenceli, eşler arası
 * küçük jestler — "hafif zorlayıcı" hissi için puanlar 150–250 bandında.
 */
export const WEEKLY_SYSTEM_REWARDS: readonly WeeklyRewardTemplate[] = [
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
] as const;

export interface WeeklySystemReward {
  /** Deterministik belge kimliği (aynı hafta = tek ödül, idempotent). */
  id: string;
  /** UTC hafta indeksi (rotasyon + tanılama için). */
  weekIndex: number;
  title: string;
  costPoints: number;
}

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
// 1970-01-01 bir Perşembe; ilk Pazartesi 1970-01-05'tir (epoch+4 gün). Hafta
// sınırını buna göre Pazartesi 00:00 UTC'ye hizalarız.
const FIRST_MONDAY_MS = 4 * DAY_MS;

/**
 * UTC tabanlı hafta indeksi. Saat diliminden BAĞIMSIZDIR: farklı saat
 * dilimindeki hane üyeleri aynı gerçek anda aynı indeksi (dolayısıyla aynı
 * ödül kimliğini) üretir. Yerel hafta sınırı kişiden kişiye kayar ve Pazar/
 * Pazartesi geçişinde mükerrer ödül doğururdu.
 */
export function weekIndexUtc(now: Millis): number {
  return Math.floor((now - FIRST_MONDAY_MS) / WEEK_MS);
}

/** Verilen ana ait haftanın sistem ödülünü deterministik olarak seçer. */
export function weeklySystemReward(now: Millis): WeeklySystemReward {
  const weekIndex = weekIndexUtc(now);
  const template = WEEKLY_SYSTEM_REWARDS[weekIndex % WEEKLY_SYSTEM_REWARDS.length];
  return {
    id: `system-w${weekIndex}`,
    weekIndex,
    title: template.title,
    costPoints: template.costPoints,
  };
}

/** Sistem (Nafu) tarafından üretilen ödüllerin createdBy işareti. */
export const SYSTEM_REWARD_AUTHOR = 'system';
