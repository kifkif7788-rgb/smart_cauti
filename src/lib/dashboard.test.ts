import { describe, expect, it } from 'vitest';
import { foleyTrend, passRateTrend } from './dashboard';

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

describe('passRateTrend', () => {
  const bkk = (iso: string) => new Date(`${iso}+07:00`);
  const row = (iso: string, all_pass: boolean) => ({ assessed_at: bkk(iso).toISOString(), all_pass });

  it('รายวันแบ่งเป็นสามเวร', () => {
    const points = passRateTrend(
      [row('2026-09-15T08:00:00', true), row('2026-09-15T09:00:00', false), row('2026-09-15T18:00:00', true)],
      'day',
      bkk('2026-09-15T12:00:00'),
    );
    expect(points.map((p) => p.label)).toEqual(['เวรเช้า', 'เวรบ่าย', 'เวรดึก']);
    expect(points[0]).toMatchObject({ total: 2, passed: 1, percent: 50 });
    expect(points[1]).toMatchObject({ total: 1, passed: 1, percent: 100 });
  });

  it('ช่วงที่ไม่มีการประเมินคืน null ไม่ใช่ศูนย์', () => {
    // ศูนย์เปอร์เซ็นต์แปลว่าประเมินแล้วไม่ผ่าน ซึ่งคนละเรื่องกับยังไม่ได้ประเมิน
    const points = passRateTrend([], 'day', bkk('2026-09-15T12:00:00'));
    expect(points.every((p) => p.percent === null)).toBe(true);
  });

  it('รายเดือนมีจุดเท่าจำนวนวันในเดือนนั้น', () => {
    expect(passRateTrend([], 'month', bkk('2026-09-15T12:00:00'))).toHaveLength(30);
    expect(passRateTrend([], 'month', bkk('2026-02-15T12:00:00'))).toHaveLength(28);
  });

  it('รายปีมี 12 จุด และจัดเข้าเดือนตามเวลาไทย', () => {
    const points = passRateTrend([row('2026-03-02T01:00:00', true)], 'year', bkk('2026-09-15T12:00:00'));
    expect(points).toHaveLength(12);
    expect(points[2]).toMatchObject({ total: 1, percent: 100 });
  });

  it('เที่ยงคืนครึ่งของไทยนับเป็นวันนั้น ไม่ใช่วันก่อนตาม UTC', () => {
    const points = passRateTrend([row('2026-09-03T00:30:00', true)], 'month', bkk('2026-09-15T12:00:00'));
    expect(points[2]).toMatchObject({ total: 1 });
  });
});
