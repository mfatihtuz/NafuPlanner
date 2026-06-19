/**
 * Tamamlanan işlere verilebilen kısa tepkiler — yarısı içten övgü, yarısı
 * esprili. Çift/aile uygulamasında küçük ama sıcak bir dokunuş.
 */

export interface ReactionDef {
  emoji: string;
  /** Erişilebilirlik etiketi (Türkçe). */
  label: string;
}

export const REACTIONS: readonly ReactionDef[] = [
  { emoji: '👏', label: 'Eline sağlık' },
  { emoji: '❤️', label: 'Bayıldım' },
  { emoji: '💪', label: 'Süpersin' },
  { emoji: '🎉', label: 'Parti zamanı' },
  { emoji: '😎', label: 'Kral/Kraliçe' },
  { emoji: '🦸', label: 'Ev kahramanı' },
];

/**
 * Üye→emoji tepki haritasını gösterim için özetler: aynı emojiyi sayar ve
 * REACTIONS sırasını korur.
 */
export function summarizeReactions(
  reactions: Record<string, string> | undefined,
): { emoji: string; count: number }[] {
  if (!reactions) return [];
  const counts = new Map<string, number>();
  for (const emoji of Object.values(reactions)) {
    counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
  }
  const order = REACTIONS.map((r) => r.emoji);
  return [...counts.entries()]
    .sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map(([emoji, count]) => ({ emoji, count }));
}
