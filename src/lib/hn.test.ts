import { describe, expect, it } from 'vitest';
import { isValidHn, normalizeHn, maskHn, isValidRemovalReason } from './hn';

describe('isValidHn', () => {
  it('รับ HN ตัวเลขล้วนตามที่โรงพยาบาลส่วนใหญ่ใช้', () => {
    expect(isValidHn('1234567')).toBe(true);
    expect(isValidHn('0001234')).toBe(true);
  });

  it('รับ HN ที่มีตัวอักษรหรือขีด เพราะรูปแบบต่างกันในแต่ละโรงพยาบาล', () => {
    expect(isValidHn('AB123456')).toBe(true);
    expect(isValidHn('64-001234')).toBe(true);
  });

  it('ปฏิเสธค่าที่สั้นหรือยาวเกินไป', () => {
    expect(isValidHn('123')).toBe(false);
    expect(isValidHn('1234567890123456')).toBe(false);
  });

  it('ปฏิเสธอักขระที่ไม่ควรมีใน HN', () => {
    expect(isValidHn('123 4567')).toBe(false);
    expect(isValidHn('นายสมชาย')).toBe(false);
    expect(isValidHn('12345/67')).toBe(false);
    expect(isValidHn(null)).toBe(false);
    expect(isValidHn(1234567)).toBe(false);
  });
});

describe('normalizeHn', () => {
  it('ตัดช่องว่างหัวท้ายและทำเป็นตัวพิมพ์ใหญ่', () => {
    // กัน HN เดียวกันถูกบันทึกเป็นคนละรายการเพราะพิมพ์ต่างกัน
    expect(normalizeHn('  ab123456 ')).toBe('AB123456');
    expect(normalizeHn('1234567')).toBe('1234567');
  });
});

describe('maskHn', () => {
  it('แสดงเฉพาะ 4 ตัวท้าย', () => {
    expect(maskHn('1234567')).toBe('••••4567');
  });

  it('HN สั้นมากแสดงเต็ม เพราะปิดบังแล้วไม่เหลือข้อมูลให้แยกผู้ป่วย', () => {
    expect(maskHn('1234')).toBe('1234');
  });

  it('ไม่หลงเหลือเลขต้นของ HN', () => {
    expect(maskHn('9876543')).not.toContain('987');
  });
});

describe('isValidRemovalReason', () => {
  it('รับเฉพาะเหตุผลที่กำหนดไว้', () => {
    expect(isValidRemovalReason('จำหน่ายผู้ป่วย')).toBe(true);
    expect(isValidRemovalReason('หมดข้อบ่งชี้ — ถอดสายตามแผนการรักษา')).toBe(true);
  });

  it('ปฏิเสธข้อความอิสระ เพื่อให้จัดกลุ่มเหตุผลตอนวิเคราะห์ได้', () => {
    expect(isValidRemovalReason('ถอดแล้ว')).toBe(false);
    expect(isValidRemovalReason('')).toBe(false);
    expect(isValidRemovalReason(null)).toBe(false);
  });
});
