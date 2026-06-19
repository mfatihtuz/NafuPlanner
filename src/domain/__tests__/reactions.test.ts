import { REACTIONS, summarizeReactions } from '../reactions';

describe('summarizeReactions', () => {
  it('boş/undefined için boş dizi', () => {
    expect(summarizeReactions(undefined)).toEqual([]);
    expect(summarizeReactions({})).toEqual([]);
  });

  it('aynı emojiyi sayar ve REACTIONS sırasını korur', () => {
    const claps = REACTIONS[0].emoji; // 👏
    const love = REACTIONS[1].emoji; // ❤️
    const summary = summarizeReactions({ u1: love, u2: claps, u3: claps });
    expect(summary).toEqual([
      { emoji: claps, count: 2 },
      { emoji: love, count: 1 },
    ]);
  });
});
