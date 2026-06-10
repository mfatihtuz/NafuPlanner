import {
  levelForPoints,
  levelProgress,
  pointsForTask,
  pointsToNextLevel,
} from '../gamification';

describe('gamification', () => {
  it('önceliğe göre puan verir', () => {
    expect(pointsForTask('low')).toBe(5);
    expect(pointsForTask('medium')).toBe(10);
    expect(pointsForTask('high')).toBe(15);
    expect(pointsForTask('urgent')).toBe(20);
  });

  it('puandan seviye hesaplar (1 tabanlı)', () => {
    expect(levelForPoints(0)).toBe(1);
    expect(levelForPoints(50)).toBe(1);
    expect(levelForPoints(99)).toBe(1);
    expect(levelForPoints(100)).toBe(2);
    expect(levelForPoints(250)).toBe(3);
  });

  it('seviye ilerlemesini 0..1 arası verir', () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(50)).toBeCloseTo(0.5);
    expect(levelProgress(100)).toBe(0);
    expect(levelProgress(175)).toBeCloseTo(0.75);
  });

  it('bir sonraki seviyeye kalan puanı verir', () => {
    expect(pointsToNextLevel(0)).toBe(100);
    expect(pointsToNextLevel(40)).toBe(60);
    expect(pointsToNextLevel(100)).toBe(100);
  });
});
