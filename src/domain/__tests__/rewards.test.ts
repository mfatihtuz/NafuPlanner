import { canApproveReward, groupRewards, isRewardPendingApproval } from '../rewards';
import type { Reward } from '../types';

let seq = 0;
function mk(partial: Partial<Reward>): Reward {
  seq += 1;
  return {
    id: `r${seq}`,
    householdId: 'h',
    title: `Ödül ${seq}`,
    costPoints: 100,
    createdBy: 'u1',
    createdAtMs: seq,
    status: 'active',
    ...partial,
  };
}

describe('groupRewards', () => {
  it('vitrin / alınan / tamamlanan olarak ayırır', () => {
    const a = mk({ status: 'active' });
    const c = mk({ status: 'claimed', claimedBy: 'u2' });
    const d = mk({ status: 'completed', claimedBy: 'u2' });
    const g = groupRewards([d, a, c]);
    expect(g.available.map((r) => r.id)).toEqual([a.id]);
    expect(g.claimed.map((r) => r.id)).toEqual([c.id]);
    expect(g.completed.map((r) => r.id)).toEqual([d.id]);
  });

  it('bilinmeyen/eski durumu "alınan"a koyar', () => {
    const legacy = mk({ status: 'won' as Reward['status'], claimedBy: 'u2' });
    expect(groupRewards([legacy]).claimed).toHaveLength(1);
  });
});

describe('onay', () => {
  it('uygulanmışsa onay bekler', () => {
    expect(isRewardPendingApproval(mk({ status: 'claimed', fulfilledBy: 'u2' }))).toBe(true);
    expect(isRewardPendingApproval(mk({ status: 'claimed' }))).toBe(false);
    expect(isRewardPendingApproval(mk({ status: 'active' }))).toBe(false);
  });

  it('yalnız sahibi (claimedBy) onaylayabilir', () => {
    const r = mk({ status: 'claimed', claimedBy: 'u1', fulfilledBy: 'u2' });
    expect(canApproveReward(r, 'u1')).toBe(true); // sahibi
    expect(canApproveReward(r, 'u2')).toBe(false); // uygulayan
    expect(canApproveReward(mk({ status: 'claimed', claimedBy: 'u1' }), 'u1')).toBe(false); // henüz uygulanmadı
  });
});
