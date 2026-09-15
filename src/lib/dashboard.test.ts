import { describe, expect, it } from 'vitest';
import { foleyTrend } from './dashboard';

describe('foleyTrend', () => {
  it('uses Thai dates and counts insertion and removal days inclusively', () => {
    const points = foleyTrend([
      { insert_date: '2026-09-09', remove_date: '2026-09-10' },
      { insert_date: '2026-09-15', remove_date: null },
      { insert_date: '2026-09-16', remove_date: null },
    ], new Date('2026-09-14T18:00:00Z'));
    expect(points.map(p => p.date)).toEqual(['2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13','2026-09-14','2026-09-15']);
    expect(points.map(p => p.count)).toEqual([1,1,0,0,0,0,1]);
  });
  it('returns seven zero counts for an empty ward across month boundaries', () => {
    const points = foleyTrend([], new Date('2026-10-01T05:00:00Z'));
    expect(points[0].date).toBe('2026-09-25');
    expect(points.every(p => p.count === 0)).toBe(true);
  });
});
