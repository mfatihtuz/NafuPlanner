import { WEEKLY_SYSTEM_REWARDS, weeklySystemReward } from '../systemRewards';

describe('weeklySystemReward', () => {
  const monday = new Date('2026-06-08T09:00:00').getTime();
  const wednesday = new Date('2026-06-10T20:00:00').getTime();
  const nextMonday = new Date('2026-06-15T09:00:00').getTime();

  it('aynı hafta içinde aynı kimlik ve ödülü verir (idempotent)', () => {
    const a = weeklySystemReward(monday);
    const b = weeklySystemReward(wednesday);
    expect(a.id).toBe(b.id);
    expect(a.title).toBe(b.title);
    expect(a.id).toMatch(/^system-w\d+$/);
  });

  it('farklı haftalarda farklı kimlik verir', () => {
    expect(weeklySystemReward(monday).id).not.toBe(weeklySystemReward(nextMonday).id);
  });

  it('havuzdan geçerli, bedeli bantta bir ödül seçer', () => {
    const r = weeklySystemReward(monday);
    expect(WEEKLY_SYSTEM_REWARDS.map((w) => w.title)).toContain(r.title);
    expect(r.costPoints).toBeGreaterThanOrEqual(150);
    expect(r.costPoints).toBeLessThanOrEqual(250);
  });
});
