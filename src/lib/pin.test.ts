import { describe, expect, it } from 'vitest';
import { isValidPinFormat, isWeakPin } from './pin';

describe('isValidPinFormat', () => {
  it('รับเฉพาะตัวเลข 6 หลักพอดี', () => {
    expect(isValidPinFormat('480291')).toBe(true);
    expect(isValidPinFormat('48029')).toBe(false);
    expect(isValidPinFormat('4802911')).toBe(false);
    expect(isValidPinFormat('48029a')).toBe(false);
    expect(isValidPinFormat(480291)).toBe(false);
  });
});

describe('isWeakPin', () => {
  it('ปฏิเสธเลขซ้ำทั้งหมด', () => {
    expect(isWeakPin('000000')).toBe(true);
    expect(isWeakPin('777777')).toBe(true);
  });

  it('ปฏิเสธเลขเรียงติดกันทั้งขึ้นและลง', () => {
    expect(isWeakPin('123456')).toBe(true);
    expect(isWeakPin('456789')).toBe(true);
    expect(isWeakPin('987654')).toBe(true);
  });

  it('ปฏิเสธชุดยอดนิยม', () => {
    expect(isWeakPin('123123')).toBe(true);
    expect(isWeakPin('112233')).toBe(true);
  });

  it('รับ PIN ที่ไม่เข้าเงื่อนไขเหล่านี้', () => {
    expect(isWeakPin('480291')).toBe(false);
    expect(isWeakPin('905317')).toBe(false);
  });

  it('ถือว่ารูปแบบที่ผิดเป็นค่าที่ใช้ไม่ได้ ผู้เรียกจึงตรวจทางเดียวได้', () => {
    expect(isWeakPin('12ab34')).toBe(true);
    expect(isWeakPin('123')).toBe(true);
  });
});
