import { describe, expect, it } from 'vitest';
import { assessorTally, foleyTrend, passRateTrend } from './dashboard';

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

  it('รายวันแบ่งเป็นสามเวร เรียงตามเวลาเริ่มที่เวรดึก', () => {
    const points = passRateTrend(
      [
        row('2026-09-15T03:00:00', true),
        row('2026-09-15T09:00:00', false),
        row('2026-09-15T12:00:00', true),
        row('2026-09-15T18:00:00', true),
      ],
      'day',
      bkk('2026-09-15T12:00:00'),
    );
    expect(points.map((p) => p.label)).toEqual(['เวรดึก', 'เวรเช้า', 'เวรบ่าย']);
    expect(points[0]).toMatchObject({ total: 1, passed: 1, percent: 100 });
    expect(points[1]).toMatchObject({ total: 2, passed: 1, percent: 50 });
    expect(points[2]).toMatchObject({ total: 1, passed: 1, percent: 100 });
  });

  it('การประเมินตอน 08.00 พอดีนับเข้าเวรดึก ไม่ใช่เวรเช้า', () => {
    // ตารางเวรเขียนเวรดึกไว้ 00.01–08.00 นาทีสุดท้ายจึงยังเป็นของเวรดึก
    const points = passRateTrend(
      [row('2026-09-15T08:00:00', true), row('2026-09-15T08:01:00', true)],
      'day',
      bkk('2026-09-15T12:00:00'),
    );
    expect(points[0]).toMatchObject({ label: 'เวรดึก', total: 1 });
    expect(points[1]).toMatchObject({ label: 'เวรเช้า', total: 1 });
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

describe('assessorTally', () => {
  const user = (id: string, employee: string, name: string) => ({
    user_id: id,
    employee_id: employee,
    full_name: name,
  });
  const row = (assessor: string, level: 'RN' | 'NA' | null) => ({
    assessor_id: assessor,
    nurse_level: level,
  });

  it('รวมเป็นรายคนพร้อมรหัสพนักงานและชื่อ', () => {
    const tally = assessorTally(
      [row('u1', 'RN'), row('u2', 'NA'), row('u1', 'RN')],
      [user('u1', 'N001', 'สมใจ ใจดี'), user('u2', 'A001', 'มานี มีนา')],
    );
    expect(tally).toEqual([
      { employeeId: 'N001', fullName: 'สมใจ ใจดี', level: 'RN', count: 2 },
      { employeeId: 'A001', fullName: 'มานี มีนา', level: 'NA', count: 1 },
    ]);
  });

  it('แยกแถวเมื่อคนเดียวประเมินต่างคุณวุฒิ ยอดรวมจึงตรงกับแท่ง RN/NA', () => {
    const tally = assessorTally(
      [row('u1', 'RN'), row('u1', 'NA'), row('u1', 'NA')],
      [user('u1', 'N001', 'สมใจ ใจดี')],
    );
    expect(tally).toEqual([
      { employeeId: 'N001', fullName: 'สมใจ ใจดี', level: 'NA', count: 2 },
      { employeeId: 'N001', fullName: 'สมใจ ใจดี', level: 'RN', count: 1 },
    ]);
    expect(tally.reduce((sum, p) => sum + p.count, 0)).toBe(3);
  });

  it('เรียงจากมากไปน้อย แล้วเรียงด้วยรหัสพนักงานให้ลำดับคงที่', () => {
    const tally = assessorTally(
      [row('u3', 'RN'), row('u1', 'RN'), row('u2', 'RN'), row('u3', 'RN')],
      [user('u1', 'N003', 'ก'), user('u2', 'N001', 'ข'), user('u3', 'N002', 'ค')],
    );
    expect(tally.map((p) => p.employeeId)).toEqual(['N002', 'N001', 'N003']);
  });

  it('การประเมินที่ไม่มีคุณวุฒิยังอยู่ในรายการ', () => {
    const tally = assessorTally([row('u1', null)], [user('u1', 'AD01', 'แอดมิน')]);
    expect(tally).toEqual([
      { employeeId: 'AD01', fullName: 'แอดมิน', level: null, count: 1 },
    ]);
  });

  it('ไม่ทิ้งการประเมินของบัญชีที่หาไม่เจอ', () => {
    // บัญชีถูกลบแล้วแต่การประเมินยังอยู่ ยอดรวมต้องไม่หายไปเงียบ ๆ
    const tally = assessorTally([row('ไม่มีบัญชีนี้', 'RN')], []);
    expect(tally).toEqual([
      { employeeId: '—', fullName: 'ไม่พบบัญชีผู้ใช้', level: 'RN', count: 1 },
    ]);
  });

  it('ไม่มีการประเมินก็ได้รายการว่าง', () => {
    expect(assessorTally([], [user('u1', 'N001', 'สมใจ ใจดี')])).toEqual([]);
  });
});
