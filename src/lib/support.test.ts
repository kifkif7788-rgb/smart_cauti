import { describe, expect, it } from 'vitest';
import {
  isSupportCategory,
  looksLikeHn,
  validateSupportMessage,
  MESSAGE_MAX,
} from './support';

describe('isSupportCategory', () => {
  it('รับเฉพาะหมวดที่มีอยู่จริง', () => {
    expect(isSupportCategory('TAG')).toBe(true);
    expect(isSupportCategory('OTHER')).toBe(true);
    expect(isSupportCategory('URGENT')).toBe(false);
    expect(isSupportCategory(null)).toBe(false);
  });
});

describe('validateSupportMessage', () => {
  it('ผ่านเมื่อข้อความยาวพอ', () => {
    expect(validateSupportMessage('ป้าย QR เตียง 5 ขาด')).toBeNull();
  });

  it('ปฏิเสธข้อความว่างหรือมีแต่ช่องว่าง', () => {
    expect(validateSupportMessage('')).toContain('กรุณาพิมพ์');
    expect(validateSupportMessage('   ')).toContain('กรุณาพิมพ์');
    expect(validateSupportMessage(undefined)).toContain('กรุณาพิมพ์');
  });

  it('ปฏิเสธข้อความสั้นเกินกว่าจะเข้าใจ', () => {
    expect(validateSupportMessage('งง')).toContain('อย่างน้อย');
  });

  it('ปฏิเสธข้อความยาวเกินกำหนด', () => {
    expect(validateSupportMessage('ก'.repeat(MESSAGE_MAX + 1))).toContain('ไม่เกิน');
  });

  it('ตัดช่องว่างหัวท้ายก่อนวัดความยาว', () => {
    expect(validateSupportMessage('    งง    ')).toContain('อย่างน้อย');
  });
});

describe('looksLikeHn', () => {
  it('เตือนเมื่อพิมพ์ HN หรือเลขยาวมาด้วย', () => {
    expect(looksLikeHn('ผู้ป่วย HN 1234567 ข้อมูลผิด')).toBe(true);
    expect(looksLikeHn('เลข 1234567 ไม่ตรง')).toBe(true);
  });

  it('ไม่เตือนกับข้อความทั่วไปที่มีเลขเตียงหรือเลขข้อ', () => {
    expect(looksLikeHn('ป้าย QR เตียง 5 ขาด')).toBe(false);
    expect(looksLikeHn('ข้อ 9 กดไม่ได้')).toBe(false);
  });
});
