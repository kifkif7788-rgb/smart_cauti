import { describe, expect, it } from 'vitest';
import { foleyDay } from './shift';

/**
 * กฎการย้ายเตียงกับการนับวันคาสาย
 *
 * การย้ายเตียงต้องคง insert_date เดิมไว้ ถ้าเปิด episode ใหม่แทน
 * จำนวนวันคาสายจะเริ่มนับหนึ่ง ทำให้ผู้ป่วยที่คาสายมานานหลุดจากการเตือน
 * "ทบทวนข้อบ่งชี้เมื่อเกิน 3 วัน" ซึ่งเป็นกลไกหลักของโครงการ
 *
 * ทดสอบที่ระดับผลลัพธ์ของการนับวัน เพราะนั่นคือสิ่งที่ผู้ใช้เห็นและใช้ตัดสินใจ
 */

const bkk = (iso: string) => new Date(`${iso}+07:00`);

describe('ย้ายเตียงแล้ววันคาสายต้องไม่รีเซ็ต', () => {
  const insertDate = '2026-09-10';
  const moveDay = bkk('2026-09-15T10:00:00');

  it('ก่อนย้ายและหลังย้ายนับได้เท่ากัน เพราะใช้ insert_date เดิม', () => {
    const before = foleyDay(insertDate, moveDay);
    const afterTransfer = foleyDay(insertDate, moveDay); // insert_date ไม่เปลี่ยน
    expect(before).toBe(6);
    expect(afterTransfer).toBe(6);
  });

  it('ถ้าเผลอเปิด episode ใหม่ วันคาสายจะกลับไปเป็น 1 ซึ่งผิด', () => {
    // ทดสอบนี้บันทึกไว้ว่าทำไมต้องมีปุ่มย้ายเตียงแยกจากการลงทะเบียนใหม่
    const wrongIfReopened = foleyDay('2026-09-15', moveDay);
    expect(wrongIfReopened).toBe(1);
    expect(wrongIfReopened).not.toBe(foleyDay(insertDate, moveDay));
  });

  it('ผู้ป่วยที่คาสายเกิน 3 วันยังติดธงเตือนหลังย้ายเตียง', () => {
    expect(foleyDay(insertDate, moveDay)).toBeGreaterThanOrEqual(3);
  });
});

describe('เงื่อนไขวันถอดสาย', () => {
  it('ถอดวันเดียวกับที่ใส่ นับเป็น 1 วัน', () => {
    expect(foleyDay('2026-09-15', bkk('2026-09-15T20:00:00'))).toBe(1);
  });

  it('คาสาย 3 วันพอดีเข้าเกณฑ์ทบทวนข้อบ่งชี้', () => {
    expect(foleyDay('2026-09-13', bkk('2026-09-15T08:00:00'))).toBe(3);
  });
});
